import BaseService from './BaseService.js';
import loanRepository from '../repositories/LoanRepository.js';
import loanScheduleRepository from '../repositories/LoanScheduleRepository.js';
import loanScheduleService from './LoanScheduleService.js';
import ledgerService from './LedgerService.js';
import auditLogService from './AuditLogService.js';
import accountHeadRepository from '../repositories/AccountHeadRepository.js';
import sequenceService from './SequenceService.js';
import loanPaymentRepository from '../repositories/LoanPaymentRepository.js';
import { foreclosureSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class ForeclosureService extends BaseService {
  constructor() {
    super(loanRepository);
  }

  /**
   * Calculate foreclosure settlement amount.
   * Outstanding = Remaining principal + Accrued interest + Penalties + Pre-closure charges
   */
  async calculateForeclosure(loanId) {
    const loan = await loanRepository.model.findById(loanId).populate('loanProductId').exec();
    if (!loan) throw AppError.notFound('Loan not found');
    if (!['active', 'overdue'].includes(loan.loanStatus)) {
      throw AppError.validation('Foreclosure is only applicable for active or overdue loans');
    }

    // Sum up pending schedule balances
    const pendingInstallments = await loanScheduleRepository.findPendingInstallments(loanId);
    const outstandingPrincipal = pendingInstallments.reduce((s, i) => s + (i.principalDue - i.principalPaid), 0);
    const outstandingInterest = pendingInstallments.reduce((s, i) => s + (i.interestDue - i.interestPaid), 0);
    const outstandingPenalty = pendingInstallments.reduce((s, i) => s + (i.penaltyDue - i.penaltyPaid), 0);

    // Pre-closure charge: 2% of outstanding principal (configurable)
    const preClosureRate = 2;
    const preClosureCharge = Math.round((outstandingPrincipal * preClosureRate) / 100 * 100) / 100;

    const settlementAmount = Math.round(
      (outstandingPrincipal + outstandingInterest + outstandingPenalty + preClosureCharge) * 100
    ) / 100;

    return {
      loanNo: loan.loanNo,
      outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
      outstandingInterest: Math.round(outstandingInterest * 100) / 100,
      outstandingPenalty: Math.round(outstandingPenalty * 100) / 100,
      preClosureCharge,
      preClosureRate,
      settlementAmount,
      remainingInstallments: pendingInstallments.length,
    };
  }

  /**
   * Execute foreclosure — settles all outstanding amounts and closes the loan.
   */
  async executeForeclosure(data, userId) {
    const validated = this.validate(foreclosureSchema, data);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const foreclosureCalc = await this.calculateForeclosure(validated.loanId);
      const loan = await loanRepository.model.findById(validated.loanId).session(session);

      // Mark all pending installments as paid
      await loanScheduleRepository.model.updateMany(
        { loanId: loan._id, paymentStatus: { $in: ['pending', 'partial', 'overdue'] }, isDeleted: false },
        { $set: { paymentStatus: 'paid', paidDate: new Date(), updatedBy: userId } },
        { session }
      );

      // Create payment record
      const receiptNo = await sequenceService.generateSequence('FCL', loan.branchId, session);
      await loanPaymentRepository.create({
        loanId: loan._id,
        paymentDate: new Date(),
        paymentMode: validated.paymentMode,
        amount: foreclosureCalc.settlementAmount,
        principalCollected: foreclosureCalc.outstandingPrincipal,
        interestCollected: foreclosureCalc.outstandingInterest,
        penaltyCollected: foreclosureCalc.outstandingPenalty + foreclosureCalc.preClosureCharge,
        sessionId: validated.sessionId || null,
        receiptNo,
        remarks: `Foreclosure settlement — ${validated.remarks || ''}`,
        createdBy: userId,
        updatedBy: userId,
      }, { session });

      // Post accounting
      const cashHead = await accountHeadRepository.findOne({ code: '11001' });
      const loanReceivableHead = await accountHeadRepository.findOne({ code: '12001' });
      const interestIncomeHead = await accountHeadRepository.findOne({ code: '41001' });
      const penaltyIncomeHead = await accountHeadRepository.findOne({ code: '41002' });

      const entries = [];
      if (cashHead) entries.push({ accountHeadId: cashHead._id.toString(), debit: foreclosureCalc.settlementAmount, credit: 0, narration: `Foreclosure collection — ${loan.loanNo}` });
      if (loanReceivableHead && foreclosureCalc.outstandingPrincipal > 0) entries.push({ accountHeadId: loanReceivableHead._id.toString(), debit: 0, credit: foreclosureCalc.outstandingPrincipal, narration: `Principal foreclosed — ${loan.loanNo}` });
      if (interestIncomeHead && foreclosureCalc.outstandingInterest > 0) entries.push({ accountHeadId: interestIncomeHead._id.toString(), debit: 0, credit: foreclosureCalc.outstandingInterest, narration: `Interest foreclosed — ${loan.loanNo}` });
      if (penaltyIncomeHead && (foreclosureCalc.outstandingPenalty + foreclosureCalc.preClosureCharge) > 0) {
        entries.push({ accountHeadId: penaltyIncomeHead._id.toString(), debit: 0, credit: foreclosureCalc.outstandingPenalty + foreclosureCalc.preClosureCharge, narration: `Pre-closure charges — ${loan.loanNo}` });
      }

      if (entries.length >= 2) {
        await ledgerService.createVoucher({
          voucherType: 'RECEIPT',
          branchId: loan.branchId.toString(),
          narration: `Foreclosure — ${loan.loanNo}`,
          entries,
        }, userId, session);
      }

      // Close the loan
      loan.loanStatus = 'foreclosed';
      loan.closedAt = new Date();
      loan.outstandingPrincipal = 0;
      loan.outstandingInterest = 0;
      loan.overdueAmount = 0;
      loan.foreclosureCharges = foreclosureCalc.preClosureCharge;
      loan.updatedBy = userId;
      await loan.save({ session });

      await auditLogService.log({
        userId,
        action: 'LOAN_FORECLOSED',
        module: 'LOAN',
        entityId: loan._id.toString(),
        description: `Loan ${loan.loanNo} foreclosed. Settlement: ₹${foreclosureCalc.settlementAmount}`,
      });

      await session.commitTransaction();
      session.endSession();

      return { loan, foreclosureCalc };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to execute foreclosure');
    }
  }
}

const foreclosureService = new ForeclosureService();
export default foreclosureService;
export { foreclosureService as ForeclosureServiceInstance };
