import BaseService from './BaseService.js';
import loanPaymentRepository from '../repositories/LoanPaymentRepository.js';
import loanRepository from '../repositories/LoanRepository.js';
import loanScheduleRepository from '../repositories/LoanScheduleRepository.js';
import loanScheduleService from './LoanScheduleService.js';
import loanAccountService from './LoanAccountService.js';
import ledgerService from './LedgerService.js';
import auditLogService from './AuditLogService.js';
import accountHeadRepository from '../repositories/AccountHeadRepository.js';
import sequenceService from './SequenceService.js';
import { recordPaymentSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LoanPaymentService extends BaseService {
  constructor() {
    super(loanPaymentRepository);
  }

  /**
   * Record an EMI payment with proper allocation:
   * Penalty → Interest → Principal
   */
  async recordPayment(data, userId) {
    const validated = this.validate(recordPaymentSchema, data);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const loan = await loanRepository.model.findById(validated.loanId).session(session);
      if (!loan) throw AppError.notFound('Loan account not found');
      if (['closed', 'written_off', 'foreclosed'].includes(loan.loanStatus)) {
        throw AppError.validation(`Cannot collect payment on a ${loan.loanStatus} loan`);
      }

      let remaining = validated.amount;
      let penaltyCollected = 0;
      let interestCollected = 0;
      let principalCollected = 0;
      let primaryScheduleId = null;

      // Get all pending/overdue installments in order
      const pendingInstallments = await loanScheduleRepository.model
        .find({ loanId: loan._id, paymentStatus: { $in: ['pending', 'partial', 'overdue'] }, isDeleted: false })
        .sort('installmentNo')
        .session(session)
        .exec();

      for (const installment of pendingInstallments) {
        if (remaining <= 0) break;
        if (!primaryScheduleId) primaryScheduleId = installment._id;

        // 1. Allocate to penalty
        const penaltyOwed = (installment.penaltyDue || 0) - (installment.penaltyPaid || 0);
        if (penaltyOwed > 0 && remaining > 0) {
          const pay = Math.min(penaltyOwed, remaining);
          penaltyCollected += pay;
          remaining -= pay;
          await loanScheduleService.applyPayment(installment._id, { principalPaid: 0, interestPaid: 0, penaltyPaid: pay }, session);
        }

        // 2. Allocate to interest
        const interestOwed = (installment.interestDue || 0) - (installment.interestPaid || 0);
        if (interestOwed > 0 && remaining > 0) {
          const pay = Math.min(interestOwed, remaining);
          interestCollected += pay;
          remaining -= pay;
          await loanScheduleService.applyPayment(installment._id, { principalPaid: 0, interestPaid: pay, penaltyPaid: 0 }, session);
        }

        // 3. Allocate to principal
        const principalOwed = (installment.principalDue || 0) - (installment.principalPaid || 0);
        if (principalOwed > 0 && remaining > 0) {
          const pay = Math.min(principalOwed, remaining);
          principalCollected += pay;
          remaining -= pay;
          await loanScheduleService.applyPayment(installment._id, { principalPaid: pay, interestPaid: 0, penaltyPaid: 0 }, session);
        }
      }

      // Update loan balances
      loan.outstandingPrincipal = Math.max(0, Math.round((loan.outstandingPrincipal - principalCollected) * 100) / 100);
      loan.outstandingInterest = Math.max(0, Math.round((loan.outstandingInterest - interestCollected) * 100) / 100);
      loan.overdueAmount = Math.max(0, Math.round((loan.overdueAmount - penaltyCollected) * 100) / 100);
      loan.penaltyAccrued = Math.max(0, Math.round((loan.penaltyAccrued - penaltyCollected) * 100) / 100);

      // Update next due date
      const nextDue = await loanScheduleRepository.model
        .findOne({ loanId: loan._id, paymentStatus: { $in: ['pending', 'partial', 'overdue'] }, isDeleted: false })
        .sort('installmentNo')
        .session(session)
        .exec();
      loan.nextDueDate = nextDue ? nextDue.dueDate : null;

      // Check if loan is fully repaid
      const isFullyPaid = loan.outstandingPrincipal <= 0 && !nextDue;
      if (isFullyPaid) {
        loan.loanStatus = 'closed';
        loan.closedAt = new Date();
      } else if (loan.loanStatus === 'overdue' && nextDue?.paymentStatus !== 'overdue') {
        loan.loanStatus = 'active';
      }
      loan.updatedBy = userId;
      await loan.save({ session });

      // Generate receipt number
      const receiptNo = await sequenceService.generateSequence('REC', loan.branchId, session);

      // Create payment record
      const payment = await loanPaymentRepository.create({
        loanId: loan._id,
        scheduleId: primaryScheduleId,
        paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
        paymentMode: validated.paymentMode,
        amount: validated.amount,
        principalCollected,
        interestCollected,
        penaltyCollected,
        sessionId: validated.sessionId || null,
        receiptNo,
        remarks: validated.remarks,
        createdBy: userId,
        updatedBy: userId,
      }, { session });

      // Post accounting journal voucher
      const cashHead = await accountHeadRepository.findOne({ headCode: 'CASH_IN_HAND' });
      const loanReceivableHead = await accountHeadRepository.findOne({ headCode: 'LOAN_RECEIVABLE' });
      const interestIncomeHead = await accountHeadRepository.findOne({ headCode: 'INTEREST_INCOME' });
      const penaltyIncomeHead = await accountHeadRepository.findOne({ headCode: 'PENALTY_INCOME' });

      const entries = [];
      if (cashHead) entries.push({ accountHeadId: cashHead._id.toString(), debit: validated.amount, credit: 0, narration: `EMI collection — ${loan.loanNo}` });
      if (loanReceivableHead && principalCollected > 0) entries.push({ accountHeadId: loanReceivableHead._id.toString(), debit: 0, credit: principalCollected, narration: `Principal repaid — ${loan.loanNo}` });
      if (interestIncomeHead && interestCollected > 0) entries.push({ accountHeadId: interestIncomeHead._id.toString(), debit: 0, credit: interestCollected, narration: `Interest collected — ${loan.loanNo}` });
      if (penaltyIncomeHead && penaltyCollected > 0) entries.push({ accountHeadId: penaltyIncomeHead._id.toString(), debit: 0, credit: penaltyCollected, narration: `Penalty collected — ${loan.loanNo}` });

      if (entries.length >= 2) {
        const voucher = await ledgerService.createVoucher({
          voucherType: 'RECEIPT',
          branchId: loan.branchId.toString(),
          narration: `EMI collection — ${loan.loanNo} — ₹${validated.amount}`,
          entries,
        }, userId, session);
        payment.voucherId = voucher._id;
        await payment.save({ session });
      }

      await auditLogService.log({
        userId,
        action: 'LOAN_EMI_COLLECTED',
        module: 'LOAN',
        entityId: loan._id.toString(),
        description: `EMI collected for ${loan.loanNo}. Amount: ₹${validated.amount}. P:₹${principalCollected} I:₹${interestCollected} Pen:₹${penaltyCollected}`,
      });

      await session.commitTransaction();
      session.endSession();

      return { payment, allocation: { principalCollected, interestCollected, penaltyCollected, unallocated: remaining } };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to record loan payment');
    }
  }

  async getPaymentHistory(loanId) {
    return loanPaymentRepository.findByLoan(loanId);
  }

  async getPaymentSummary(loanId) {
    return loanPaymentRepository.getPaymentSummary(loanId);
  }

  async listPayments(filters = {}, options = {}) {
    const query = { isDeleted: false };
    if (filters.loanId) query.loanId = new mongoose.Types.ObjectId(filters.loanId);
    if (filters.startDate && filters.endDate) {
      query.paymentDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
      };
    }
    return loanPaymentRepository.findMany(query, {
      ...options,
      populate: [{ path: 'loanId', select: 'loanNo memberId' }],
      sort: '-paymentDate',
    });
  }
}

const loanPaymentService = new LoanPaymentService();
export default loanPaymentService;
export { loanPaymentService as LoanPaymentServiceInstance };
