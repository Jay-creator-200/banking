import BaseService from './BaseService.js';
import ddsAccountRepository from '../repositories/DDSAccountRepository.js';
import ddsCollectionRepository from '../repositories/DDSCollectionRepository.js';
import sequenceService from './SequenceService.js';
import transactionService from './TransactionService.js';
import depositInterestService from './DepositInterestService.js';
import auditLogService from './AuditLogService.js';
import { openDDSAccountSchema, collectDDSAmountSchema } from '../schemas/deposit.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class DDSService extends BaseService {
  constructor() {
    super(ddsAccountRepository);
  }

  /**
   * Book a new DDS account
   */
  async openAccount(data, userId) {
    const validated = this.validate(openDDSAccountSchema, data);
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
      if (scheme.schemeType !== 'DDS') {
        throw AppError.validation(`Selected scheme is of type ${scheme.schemeType}, not DDS.`);
      }
      if (validated.dailyAmount < scheme.minimumDepositAmount || validated.dailyAmount > scheme.maximumDepositAmount) {
        throw AppError.validation(`Daily amount must be between ₹${scheme.minimumDepositAmount} and ₹${scheme.maximumDepositAmount}`);
      }
      if (validated.durationDays < scheme.minimumTenure || validated.durationDays > scheme.maximumTenure) {
        throw AppError.validation(`Duration must be between ${scheme.minimumTenure} and ${scheme.maximumTenure} days`);
      }

      // 3. Generate DDS Account number atomically
      const ddsAccountNo = await sequenceService.generateSequence('DDS', validated.branchId, session);

      // 4. Calculate maturity details
      const startDate = validated.startDate ? new Date(validated.startDate) : new Date();
      const maturityDate = new Date(startDate);
      maturityDate.setDate(maturityDate.getDate() + validated.durationDays);

      const interestCalc = depositInterestService.calculateDDS(
        validated.dailyAmount,
        scheme.interestRate / 100,
        validated.durationDays
      );

      // 5. Create DDS Account
      const ddsAccountPayload = {
        ddsAccountNo,
        memberId: validated.memberId,
        schemeId: validated.schemeId,
        branchId: validated.branchId,
        dailyAmount: validated.dailyAmount,
        durationDays: validated.durationDays,
        startDate,
        maturityDate,
        totalDeposit: 0,
        interestAmount: interestCalc.interestAmount,
        maturityAmount: interestCalc.maturityAmount,
        status: 'active',
        createdBy: userId,
        updatedBy: userId,
      };

      const [ddsAccount] = await ddsAccountRepository.model.create([ddsAccountPayload], { session });

      await auditLogService.log({
        userId,
        action: 'DDS_ACCOUNT_OPENED',
        module: 'DEPOSITS',
        entityId: ddsAccount._id.toString(),
        description: `Opened DDS Account ${ddsAccount.ddsAccountNo} for Member ${member.memberNo || member._id}`,
      });

      await session.commitTransaction();
      session.endSession();
      return ddsAccount;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to book DDS Account');
    }
  }

  /**
   * Collect DDS Amount (creates a Transaction Request in PENDING state)
   */
  async collectAmount(data, userId) {
    const validated = this.validate(collectDDSAmountSchema, data);

    const ddsAccount = await ddsAccountRepository.findById(validated.ddsAccountId);
    if (!ddsAccount) throw AppError.notFound('DDS Account not found');
    if (ddsAccount.status.toUpperCase() !== 'ACTIVE') {
      throw AppError.validation(`DDS Account is not active (current status: ${ddsAccount.status})`);
    }

    const txnType = validated.paymentMode === 'CASH' ? 'DDS_DEPOSIT' : 'DDS_DEPOSIT_TRANSFER';

    // Create pending transaction request
    const transaction = await transactionService.createTransaction({
      branchId: ddsAccount.branchId,
      memberId: ddsAccount.memberId,
      accountType: 'scheme',
      accountId: ddsAccount.ddsAccountNo,
      transactionType: txnType,
      paymentMode: validated.paymentMode,
      amount: validated.amount,
      referenceNo: data.fundingSavingsAccountNo || data.referenceNo || null,
      narration: `DDS collection for ${ddsAccount.ddsAccountNo}`,
      sourceCollection: 'DDSAccount',
      sourceId: ddsAccount._id.toString(),
      sessionId: data.sessionId || null,
    }, userId);

    return transaction;
  }

  /**
   * Post-approval hook called when transaction is approved.
   */
  async handlePostApprovalDeposit(transaction, userId, session) {
    const ddsAccount = await ddsAccountRepository.model.findOne({ ddsAccountNo: transaction.accountId }).session(session);
    if (!ddsAccount) throw AppError.notFound(`DDS Account ${transaction.accountId} not found`);

    // 1. Update DDS Account total deposit
    ddsAccount.totalDeposit = Math.round((ddsAccount.totalDeposit + transaction.amount) * 100) / 100;
    ddsAccount.updatedBy = userId;
    await ddsAccount.save({ session });

    // 2. Log DDS Collection line
    await ddsCollectionRepository.model.create([{
      ddsAccountId: ddsAccount._id,
      collectionDate: transaction.approvedAt || new Date(),
      amount: transaction.amount,
      collectorId: transaction.createdBy,
      status: 'posted',
    }], { session });

    // Update transaction balanceAfter
    transaction.balanceAfter = ddsAccount.totalDeposit;
    await transaction.save({ session });
  }
}

const ddsService = new DDSService();
export default ddsService;
export { ddsService as DDSServiceInstance };
