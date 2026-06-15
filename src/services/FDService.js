import BaseService from './BaseService.js';
import fdAccountRepository from '../repositories/FDAccountRepository.js';
import sequenceService from './SequenceService.js';
import transactionService from './TransactionService.js';
import depositInterestService from './DepositInterestService.js';
import auditLogService from './AuditLogService.js';
import { openFDAccountSchema } from '../schemas/deposit.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class FDService extends BaseService {
  constructor() {
    super(fdAccountRepository);
  }

  /**
   * Book a new FD account
   */
  async openAccount(data, userId) {
    const validated = this.validate(openFDAccountSchema, data);
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
      if (scheme.schemeType !== 'FD') {
        throw AppError.validation(`Selected scheme is of type ${scheme.schemeType}, not FD.`);
      }
      if (validated.principalAmount < scheme.minimumDepositAmount || validated.principalAmount > scheme.maximumDepositAmount) {
        throw AppError.validation(`Principal amount must be between ₹${scheme.minimumDepositAmount} and ₹${scheme.maximumDepositAmount}`);
      }
      if (validated.tenureMonths < scheme.minimumTenure || validated.tenureMonths > scheme.maximumTenure) {
        throw AppError.validation(`Tenure must be between ${scheme.minimumTenure} and ${scheme.maximumTenure} months`);
      }

      // 3. Generate FD Account number atomically
      const fdAccountNo = await sequenceService.generateSequence('FD', validated.branchId, session);

      // 4. Calculate maturity details
      const startDate = validated.startDate ? new Date(validated.startDate) : new Date();
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + validated.tenureMonths);

      const interestCalc = depositInterestService.calculateFD(
        validated.principalAmount,
        scheme.interestRate / 100,
        validated.tenureMonths,
        scheme.compoundingFrequency || 'quarterly',
        scheme.interestType || 'compound'
      );

      // 5. Create FD Account doc
      const fdAccountPayload = {
        fdAccountNo,
        memberId: validated.memberId,
        schemeId: validated.schemeId,
        branchId: validated.branchId,
        principalAmount: validated.principalAmount,
        interestRate: scheme.interestRate,
        tenureMonths: validated.tenureMonths,
        startDate,
        maturityDate,
        interestAmount: interestCalc.interestAmount,
        maturityAmount: interestCalc.maturityAmount,
        paymentMode: validated.paymentMode || 'maturity',
        status: 'pending_funding',
        createdBy: userId,
        updatedBy: userId,
      };

      const [fdAccount] = await fdAccountRepository.model.create([fdAccountPayload], { session });

      await auditLogService.log({
        userId,
        action: 'FD_ACCOUNT_OPENED',
        module: 'DEPOSITS',
        entityId: fdAccount._id.toString(),
        description: `Opened FD Account ${fdAccount.fdAccountNo} for Member ${member.memberNo || member._id}`,
      });

      // 6. Create funding transaction request immediately (Maker phase)
      const fundingSource = data.fundingSource || 'CASH';
      const txnType = fundingSource === 'CASH' ? 'FD_DEPOSIT' : 'FD_DEPOSIT_TRANSFER';
      
      await transactionService.createTransaction({
        branchId: validated.branchId,
        memberId: validated.memberId,
        accountType: 'scheme',
        accountId: fdAccount.fdAccountNo,
        transactionType: txnType,
        paymentMode: fundingSource,
        amount: validated.principalAmount,
        referenceNo: data.fundingSavingsAccountNo || 'Initial Funding',
        narration: `FD initial principal deposit - ${fdAccount.fdAccountNo}`,
        sourceCollection: 'FDAccount',
        sourceId: fdAccount._id.toString(),
        sessionId: data.sessionId || null,
      }, userId);

      await session.commitTransaction();
      session.endSession();
      return fdAccount;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to book FD Account');
    }
  }

  /**
   * Post-approval hook called when transaction is approved.
   * Activates the FD account (moves it from pending_funding → active)
   * and records the balanceAfter on the transaction.
   */
  async handlePostApprovalDeposit(transaction, userId, session) {
    const fdAccount = await fdAccountRepository.model.findOne({ fdAccountNo: transaction.accountId }).session(session);
    if (!fdAccount) throw AppError.notFound(`FD Account ${transaction.accountId} not found`);

    // Activate the account now that funding is confirmed
    if (fdAccount.status === 'pending_funding') {
      fdAccount.status = 'active';
      fdAccount.updatedBy = userId;
      await fdAccount.save({ session });
    }

    // Record balanceAfter on the transaction
    transaction.balanceAfter = fdAccount.principalAmount;
    await transaction.save({ session });
  }
}

const fdService = new FDService();
export default fdService;
export { fdService as FDServiceInstance };
