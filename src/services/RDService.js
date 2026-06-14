import BaseService from './BaseService.js';
import rdAccountRepository from '../repositories/RDAccountRepository.js';
import rdInstallmentRepository from '../repositories/RDInstallmentRepository.js';
import sequenceService from './SequenceService.js';
import transactionService from './TransactionService.js';
import depositInterestService from './DepositInterestService.js';
import auditLogService from './AuditLogService.js';
import { openRDAccountSchema, collectRDInstallmentSchema } from '../schemas/deposit.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class RDService extends BaseService {
  constructor() {
    super(rdAccountRepository);
  }

  /**
   * Book a new RD account
   */
  async openAccount(data, userId) {
    const validated = this.validate(openRDAccountSchema, data);
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
      if (scheme.schemeType !== 'RD') {
        throw AppError.validation(`Selected scheme is of type ${scheme.schemeType}, not RD.`);
      }
      if (validated.monthlyInstallment < scheme.minimumDepositAmount || validated.monthlyInstallment > scheme.maximumDepositAmount) {
        throw AppError.validation(`Monthly installment must be between ₹${scheme.minimumDepositAmount} and ₹${scheme.maximumDepositAmount}`);
      }
      if (validated.tenureMonths < scheme.minimumTenure || validated.tenureMonths > scheme.maximumTenure) {
        throw AppError.validation(`Tenure must be between ${scheme.minimumTenure} and ${scheme.maximumTenure} months`);
      }

      // 3. Generate RD Account number atomically
      const rdAccountNo = await sequenceService.generateSequence('RD', validated.branchId, session);

      // 4. Calculate maturity
      const startDate = validated.startDate ? new Date(validated.startDate) : new Date();
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + validated.tenureMonths);

      const interestCalc = depositInterestService.calculateRD(
        validated.monthlyInstallment,
        scheme.interestRate / 100,
        validated.tenureMonths
      );

      const nextInstallmentDate = new Date(startDate);
      nextInstallmentDate.setMonth(nextInstallmentDate.getMonth() + 1);

      // 5. Create RD Account
      const rdAccountPayload = {
        rdAccountNo,
        memberId: validated.memberId,
        schemeId: validated.schemeId,
        branchId: validated.branchId,
        monthlyInstallment: validated.monthlyInstallment,
        tenureMonths: validated.tenureMonths,
        interestRate: scheme.interestRate,
        startDate,
        maturityDate,
        totalDepositAmount: 0,
        totalInterest: interestCalc.totalInterest,
        maturityAmount: interestCalc.maturityAmount,
        status: 'active',
        nextInstallmentDate,
        createdBy: userId,
        updatedBy: userId,
      };

      const [rdAccount] = await rdAccountRepository.model.create([rdAccountPayload], { session });

      // 6. Generate Installment Schedule
      await depositInterestService.generateRDInstallmentSchedule(rdAccount, session);

      await auditLogService.log({
        userId,
        action: 'RD_ACCOUNT_OPENED',
        module: 'DEPOSITS',
        entityId: rdAccount._id.toString(),
        description: `Opened RD Account ${rdAccount.rdAccountNo} for Member ${member.memberNo || member._id}`,
      });

      // 7. Initial funding if provided in input
      if (data.fundingSource && data.fundingSource !== 'NONE') {
        const txnType = data.fundingSource === 'CASH' ? 'RD_DEPOSIT' : 'RD_DEPOSIT_TRANSFER';
        await transactionService.createTransaction({
          branchId: validated.branchId,
          memberId: validated.memberId,
          accountType: 'scheme',
          accountId: rdAccount.rdAccountNo,
          transactionType: txnType,
          paymentMode: data.fundingSource,
          amount: validated.monthlyInstallment,
          referenceNo: data.fundingSavingsAccountNo || 'Initial Funding',
          narration: `RD Initial Installment Deposit - ${rdAccount.rdAccountNo}`,
          sourceCollection: 'RDAccount',
          sourceId: rdAccount._id.toString(),
          sessionId: data.sessionId || null,
        }, userId);
      }

      await session.commitTransaction();
      session.endSession();
      return rdAccount;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to book RD Account');
    }
  }

  /**
   * Collect RD Installment (creates a Transaction Request in PENDING state)
   */
  async collectInstallment(data, userId) {
    const validated = this.validate(collectRDInstallmentSchema, data);
    
    const rdAccount = await rdAccountRepository.findById(validated.rdAccountId);
    if (!rdAccount) throw AppError.notFound('RD Account not found');
    if (rdAccount.status.toUpperCase() !== 'ACTIVE') {
      throw AppError.validation(`RD Account is not active (current status: ${rdAccount.status})`);
    }

    const txnType = validated.paymentMode === 'CASH' ? 'RD_DEPOSIT' : 'RD_DEPOSIT_TRANSFER';

    // Create pending transaction request
    const transaction = await transactionService.createTransaction({
      branchId: rdAccount.branchId,
      memberId: rdAccount.memberId,
      accountType: 'scheme',
      accountId: rdAccount.rdAccountNo,
      transactionType: txnType,
      paymentMode: validated.paymentMode,
      amount: validated.amount,
      referenceNo: data.fundingSavingsAccountNo || data.referenceNo || null,
      narration: `RD Installment payment for ${rdAccount.rdAccountNo} (Inst #${validated.installmentNo})`,
      sourceCollection: 'RDAccount',
      sourceId: rdAccount._id.toString(),
      sessionId: data.sessionId || null,
    }, userId);

    return transaction;
  }

  /**
   * Post-approval hook called when transaction is approved.
   * Updates account balances and marks installments as paid.
   */
  async handlePostApprovalDeposit(transaction, userId, session) {
    const rdAccount = await rdAccountRepository.model.findOne({ rdAccountNo: transaction.accountId }).session(session);
    if (!rdAccount) throw AppError.notFound(`RD Account ${transaction.accountId} not found`);

    // 1. Update RD Account total deposit
    rdAccount.totalDepositAmount = Math.round((rdAccount.totalDepositAmount + transaction.amount) * 100) / 100;

    // 2. Find and update the installment
    // Try to match installment specified in narration or get the first pending one
    const narrationMatch = transaction.narration && transaction.narration.match(/Inst\s*#(\d+)/);
    const installmentNo = narrationMatch ? parseInt(narrationMatch[1], 10) : null;

    let installment;
    if (installmentNo) {
      installment = await rdInstallmentRepository.model.findOne({
        rdAccountId: rdAccount._id,
        installmentNo,
        status: 'pending',
      }).session(session);
    }

    // Fallback: get first pending installment
    if (!installment) {
      installment = await rdInstallmentRepository.model.findOne({
        rdAccountId: rdAccount._id,
        status: 'pending',
      }).sort('installmentNo').session(session);
    }

    if (installment) {
      installment.paidAmount = transaction.amount;
      installment.paidDate = new Date();
      installment.status = 'paid';
      await installment.save({ session });
    }

    // 3. Update next installment due date
    const nextPending = await rdInstallmentRepository.model.findOne({
      rdAccountId: rdAccount._id,
      status: 'pending',
    }).sort('installmentNo').session(session);

    if (nextPending) {
      rdAccount.nextInstallmentDate = nextPending.dueDate;
    } else {
      rdAccount.nextInstallmentDate = null;
      rdAccount.status = 'matured'; // Auto-mature if all installments paid
    }

    rdAccount.updatedBy = userId;
    await rdAccount.save({ session });

    // Update transaction balanceAfter
    transaction.balanceAfter = rdAccount.totalDepositAmount;
    await transaction.save({ session });
  }
}

const rdService = new RDService();
export default rdService;
export { rdService as RDServiceInstance };
