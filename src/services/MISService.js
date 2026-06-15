import BaseService from './BaseService.js';
import misAccountRepository from '../repositories/MISAccountRepository.js';
import sequenceService from './SequenceService.js';
import transactionService from './TransactionService.js';
import depositInterestService from './DepositInterestService.js';
import auditLogService from './AuditLogService.js';
import { openMISAccountSchema } from '../schemas/deposit.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class MISService extends BaseService {
  constructor() {
    super(misAccountRepository);
  }

  /**
   * Book a new MIS account
   */
  async openAccount(data, userId) {
    const validated = this.validate(openMISAccountSchema, data);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch Member & Validate
      const Member = mongoose.model('Member');
      const member = await Member.findById(validated.memberId).session(session);
      if (!member) throw AppError.notFound('Member not found');
      if (member.memberStatus !== 'active') {
        throw AppError.validation(`Member status is ${member.memberStatus}. Must be active.`);
      }

      // 2. Fetch Scheme & Validate
      const DepositScheme = mongoose.model('DepositScheme');
      const scheme = await DepositScheme.findById(validated.schemeId).session(session);
      if (!scheme) throw AppError.notFound('Deposit scheme not found');
      if (scheme.schemeType !== 'MIS') {
        throw AppError.validation(`Selected scheme is of type ${scheme.schemeType}, not MIS.`);
      }
      if (validated.principalAmount < scheme.minimumDepositAmount || validated.principalAmount > scheme.maximumDepositAmount) {
        throw AppError.validation(`Principal amount must be between ₹${scheme.minimumDepositAmount} and ₹${scheme.maximumDepositAmount}`);
      }
      if (validated.tenureMonths < scheme.minimumTenure || validated.tenureMonths > scheme.maximumTenure) {
        throw AppError.validation(`Tenure must be between ${scheme.minimumTenure} and ${scheme.maximumTenure} months`);
      }

      // 3. Generate MIS Account number atomically
      const misAccountNo = await sequenceService.generateSequence('MIS', validated.branchId, session);

      // 4. Calculate interest payouts
      const startDate = validated.startDate ? new Date(validated.startDate) : new Date();
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + validated.tenureMonths);

      const interestCalc = depositInterestService.calculateMIS(
        validated.principalAmount,
        scheme.interestRate / 100
      );

      const nextPayoutDate = new Date(startDate);
      nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);

      // 5. Create MIS Account doc
      const misAccountPayload = {
        misAccountNo,
        memberId: validated.memberId,
        schemeId: validated.schemeId,
        branchId: validated.branchId,
        principalAmount: validated.principalAmount,
        interestRate: scheme.interestRate,
        monthlyInterestAmount: interestCalc.monthlyInterestAmount,
        startDate,
        maturityDate,
        nextPayoutDate,
        status: 'pending_funding',
        createdBy: userId,
        updatedBy: userId,
      };

      const [misAccount] = await misAccountRepository.model.create([misAccountPayload], { session });

      await auditLogService.log({
        userId,
        action: 'MIS_ACCOUNT_OPENED',
        module: 'DEPOSITS',
        entityId: misAccount._id.toString(),
        description: `Opened MIS Account ${misAccount.misAccountNo} for Member ${member.memberNo || member._id}`,
      });

      // 6. Create initial principal deposit transaction request
      const fundingSource = data.fundingSource || 'CASH';
      const txnType = fundingSource === 'CASH' ? 'MIS_DEPOSIT' : 'MIS_DEPOSIT_TRANSFER';

      await transactionService.createTransaction({
        branchId: validated.branchId,
        memberId: validated.memberId,
        accountType: 'scheme',
        accountId: misAccount.misAccountNo,
        transactionType: txnType,
        paymentMode: fundingSource,
        amount: validated.principalAmount,
        referenceNo: data.fundingSavingsAccountNo || 'Initial Funding',
        narration: `MIS initial principal deposit - ${misAccount.misAccountNo}`,
        sourceCollection: 'MISAccount',
        sourceId: misAccount._id.toString(),
        sessionId: data.sessionId || null,
      }, userId);

      await session.commitTransaction();
      session.endSession();
      return misAccount;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to book MIS Account');
    }
  }

  /**
   * Post-approval hook called when transaction is approved.
   * Activates the MIS account (moves it from pending_funding → active)
   * and records the balanceAfter on the transaction.
   */
  async handlePostApprovalDeposit(transaction, userId, session) {
    const misAccount = await misAccountRepository.model.findOne({ misAccountNo: transaction.accountId }).session(session);
    if (!misAccount) throw AppError.notFound(`MIS Account ${transaction.accountId} not found`);

    // Activate the account now that funding is confirmed
    if (misAccount.status === 'pending_funding') {
      misAccount.status = 'active';
      misAccount.updatedBy = userId;
      await misAccount.save({ session });
    }

    // Record balanceAfter on the transaction
    transaction.balanceAfter = misAccount.principalAmount;
    await transaction.save({ session });
  }

  /**
   * Process monthly payout for a single MIS Account
   */
  async processPayout(misAccount, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find Member's active savings account to credit interest to
      const SavingsAccount = mongoose.model('SavingsAccount');
      const destAccount = await SavingsAccount.findOne({
        memberId: misAccount.memberId,
        status: 'active',
      }).session(session);

      const txnType = destAccount ? 'MIS_PAYOUT_TRANSFER' : 'MIS_PAYOUT';
      const destAccNo = destAccount ? destAccount.accountNo : 'Cash Payout';

      // Create transaction for payout (requires approval or auto-approves? Let's create it in PENDING state)
      const transaction = await transactionService.createTransaction({
        branchId: misAccount.branchId,
        memberId: misAccount.memberId,
        accountType: 'scheme',
        accountId: destAccNo,
        transactionType: txnType,
        paymentMode: destAccount ? 'TRANSFER' : 'CASH',
        amount: misAccount.monthlyInterestAmount,
        referenceNo: misAccount.misAccountNo,
        narration: `MIS interest monthly payout for ${misAccount.misAccountNo}`,
        sourceCollection: 'MISAccount',
        sourceId: misAccount._id.toString(),
      }, userId);

      await session.commitTransaction();
      session.endSession();
      return transaction;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * Post-approval hook called when payout transaction is approved.
   */
  async handlePostApprovalPayout(transaction, userId, session) {
    // transaction.referenceNo stores the misAccountNo
    const misAccount = await misAccountRepository.model.findOne({ misAccountNo: transaction.referenceNo }).session(session);
    if (!misAccount) throw AppError.notFound(`MIS Account ${transaction.referenceNo} not found`);

    // Advance nextPayoutDate by 1 month
    const currentPayout = new Date(misAccount.nextPayoutDate);
    currentPayout.setMonth(currentPayout.getMonth() + 1);
    misAccount.nextPayoutDate = currentPayout;

    // Check if MIS account has reached its maturity date
    if (misAccount.nextPayoutDate >= misAccount.maturityDate) {
      misAccount.status = 'matured';
      misAccount.nextPayoutDate = null;
    }

    misAccount.updatedBy = userId;
    await misAccount.save({ session });
  }

  /**
   * Process bulk due monthly payouts
   */
  async processDuePayouts(userId) {
    const today = new Date();
    const dueAccounts = await misAccountRepository.model.find({
      status: 'active', // pending_funding accounts must never receive payouts
      nextPayoutDate: { $lte: today },
      isDeleted: false,
    });

    const results = [];
    for (const acc of dueAccounts) {
      try {
        const txn = await this.processPayout(acc, userId);
        results.push({ accountNo: acc.misAccountNo, success: true, txnNo: txn.transactionNo });
      } catch (err) {
        results.push({ accountNo: acc.misAccountNo, success: false, error: err.message });
      }
    }
    return results;
  }
}

const misService = new MISService();
export default misService;
export { misService as MISServiceInstance };
