import BaseService from './BaseService.js';
import loanRepository from '../repositories/LoanRepository.js';
import loanApplicationRepository from '../repositories/LoanApplicationRepository.js';
import loanProductRepository from '../repositories/LoanProductRepository.js';
import loanScheduleService from './LoanScheduleService.js';
import sequenceService from './SequenceService.js';
import ledgerService from './LedgerService.js';
import auditLogService from './AuditLogService.js';
import accountHeadRepository from '../repositories/AccountHeadRepository.js';
import { disburseLoanSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LoanAccountService extends BaseService {
  constructor() {
    super(loanRepository);
  }

  /**
   * Disburse loan: create loan account + schedule + journal voucher.
   */
  async disburseLoan(data, userId) {
    const validated = this.validate(disburseLoanSchema, data);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch and validate application
      const application = await loanApplicationRepository.findById(validated.applicationId);
      if (!application) throw AppError.notFound('Loan application not found');
      if (application.applicationStatus !== 'approved') {
        throw AppError.validation('Loan can only be disbursed from an approved application');
      }

      // Check no loan already exists for this application
      const existingLoan = await loanRepository.findOne({ applicationId: application._id });
      if (existingLoan) throw AppError.conflict('A loan account already exists for this application');

      // Fetch product
      const product = await loanProductRepository.findById(application.loanProductId);
      if (!product) throw AppError.notFound('Loan product not found');

      const principal = application.approvedAmount;
      const tenure = application.approvedTenure;
      const disbursementDate = validated.disbursementDate ? new Date(validated.disbursementDate) : new Date();

      // Calculate EMI
      const emiCalc = product.interestType === 'flat'
        ? loanScheduleService.calculateFlatEMI(principal, product.interestRate, tenure)
        : loanScheduleService.calculateReducingEMI(principal, product.interestRate, tenure);

      // First due date = 1 month from disbursement
      const firstDueDate = new Date(disbursementDate);
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);

      // Generate loan number
      const loanNo = await sequenceService.generateSequence('LN', application.branchId, session);

      // Create loan account
      const loan = await loanRepository.create({
        loanNo,
        memberId: application.memberId,
        branchId: application.branchId,
        loanProductId: application.loanProductId,
        applicationId: application._id,
        disbursementDate,
        principalAmount: principal,
        interestRate: product.interestRate,
        interestType: product.interestType,
        tenureMonths: tenure,
        emiAmount: emiCalc.emi,
        totalInterest: emiCalc.totalInterest,
        totalPayable: emiCalc.totalPayable,
        outstandingPrincipal: principal,
        outstandingInterest: emiCalc.totalInterest,
        overdueAmount: 0,
        nextDueDate: firstDueDate,
        loanStatus: 'active',
        disbursementMode: validated.disbursementMode,
        createdBy: userId,
        updatedBy: userId,
      }, { session });

      // Generate EMI schedule
      await loanScheduleService.generateSchedule(loan, session);

      // Update application to reference the loan
      application.applicationStatus = 'approved'; // stays approved
      application.updatedBy = userId;
      await application.save({ session });

      // Post accounting journal voucher
      // Find account heads (Loan Receivable & Cash In Hand)
      const loanReceivableHead = await accountHeadRepository.findOne({ headCode: 'LOAN_RECEIVABLE' });
      const cashHead = await accountHeadRepository.findOne({ headCode: 'CASH_IN_HAND' });

      if (loanReceivableHead && cashHead) {
        await ledgerService.createVoucher({
          voucherType: 'PAYMENT',
          branchId: application.branchId.toString(),
          narration: `Loan disbursement — ${loanNo}`,
          entries: [
            {
              accountHeadId: loanReceivableHead._id.toString(),
              debit: principal,
              credit: 0,
              memberId: application.memberId.toString(),
              narration: `Loan principal disbursed — ${loanNo}`,
            },
            {
              accountHeadId: cashHead._id.toString(),
              debit: 0,
              credit: principal,
              narration: `Cash paid out for loan — ${loanNo}`,
            },
          ],
        }, userId, session);
      }

      await auditLogService.log({
        userId,
        action: 'LOAN_DISBURSED',
        module: 'LOAN',
        entityId: loan._id.toString(),
        description: `Loan ${loanNo} disbursed. Principal: ₹${principal}. Mode: ${validated.disbursementMode}`,
      });

      await session.commitTransaction();
      session.endSession();

      return loan;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to disburse loan');
    }
  }

  /**
   * Get full loan detail with related data.
   */
  async getLoanDetail(id) {
    const loan = await loanRepository.findById(id, [
      { path: 'memberId', select: 'fullName memberNo mobile email' },
      { path: 'branchId', select: 'branchName branchCode' },
      { path: 'loanProductId' },
      { path: 'applicationId' },
    ]);
    if (!loan) throw AppError.notFound('Loan not found');
    return loan;
  }

  /**
   * List loans with filters and pagination.
   */
  async listLoans(filters = {}, options = {}) {
    const query = { isDeleted: false };
    if (filters.memberId) query.memberId = new mongoose.Types.ObjectId(filters.memberId);
    if (filters.branchId) query.branchId = new mongoose.Types.ObjectId(filters.branchId);
    if (filters.loanProductId) query.loanProductId = new mongoose.Types.ObjectId(filters.loanProductId);
    if (filters.loanStatus) query.loanStatus = filters.loanStatus;
    if (filters.startDate && filters.endDate) {
      query.disbursementDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
      };
    }

    return loanRepository.findMany(query, {
      ...options,
      populate: [
        { path: 'memberId', select: 'fullName memberNo mobile' },
        { path: 'branchId', select: 'branchName branchCode' },
        { path: 'loanProductId', select: 'productName productCode' },
      ],
      sort: '-disbursementDate',
    });
  }

  /**
   * Scan and mark overdue loans. Call daily or on demand.
   */
  async runOverdueScan(userId = 'SYSTEM') {
    const overdueLoans = await loanRepository.findOverdueLoans();
    let updated = 0;
    for (const loan of overdueLoans) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // Mark schedule installments as overdue
        await loanScheduleService.markOverdueInstallments(loan._id, session);

        // Update loan status
        const loanDoc = await loanRepository.model.findById(loan._id).session(session);
        if (loanDoc && loanDoc.loanStatus === 'active') {
          loanDoc.loanStatus = 'overdue';
          loanDoc.updatedBy = userId;
          await loanDoc.save({ session });
          updated++;
        }

        await session.commitTransaction();
        session.endSession();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Overdue scan failed for loan ${loan._id}:`, err.message);
      }
    }
    return { scanned: overdueLoans.length, updated };
  }

  /**
   * Close a loan (after full payment).
   */
  async closeLoan(loanId, userId, session = null) {
    const loanDoc = await loanRepository.model.findById(loanId).session(session);
    if (!loanDoc) throw AppError.notFound('Loan not found');
    loanDoc.loanStatus = 'closed';
    loanDoc.closedAt = new Date();
    loanDoc.outstandingPrincipal = 0;
    loanDoc.outstandingInterest = 0;
    loanDoc.overdueAmount = 0;
    loanDoc.updatedBy = userId;
    await loanDoc.save({ session });

    await auditLogService.log({
      userId,
      action: 'LOAN_CLOSED',
      module: 'LOAN',
      entityId: loanId.toString(),
      description: `Loan ${loanDoc.loanNo} closed`,
    });

    return loanDoc;
  }

  /**
   * Write-off a loan after approval.
   */
  async writeoffLoan(loanId, userId, session = null) {
    const loanDoc = await loanRepository.model.findById(loanId).session(session);
    if (!loanDoc) throw AppError.notFound('Loan not found');
    if (!['active', 'overdue'].includes(loanDoc.loanStatus)) {
      throw AppError.validation('Only active or overdue loans can be written off');
    }

    // Post write-off journal entry
    const loanReceivableHead = await accountHeadRepository.findOne({ headCode: 'LOAN_RECEIVABLE' });
    const writeoffHead = await accountHeadRepository.findOne({ headCode: 'WRITEOFF_EXPENSE' });
    if (loanReceivableHead && writeoffHead) {
      await ledgerService.createVoucher({
        voucherType: 'JOURNAL',
        branchId: loanDoc.branchId.toString(),
        narration: `Loan write-off — ${loanDoc.loanNo}`,
        entries: [
          { accountHeadId: writeoffHead._id.toString(), debit: loanDoc.outstandingPrincipal, credit: 0, narration: `Write-off expense — ${loanDoc.loanNo}` },
          { accountHeadId: loanReceivableHead._id.toString(), debit: 0, credit: loanDoc.outstandingPrincipal, narration: `Loan receivable written off — ${loanDoc.loanNo}` },
        ],
      }, userId, session);
    }

    loanDoc.loanStatus = 'written_off';
    loanDoc.closedAt = new Date();
    loanDoc.updatedBy = userId;
    await loanDoc.save({ session });

    await auditLogService.log({
      userId,
      action: 'LOAN_WRITTEN_OFF',
      module: 'LOAN',
      entityId: loanId.toString(),
      description: `Loan ${loanDoc.loanNo} written off`,
    });

    return loanDoc;
  }
}

const loanAccountService = new LoanAccountService();
export default loanAccountService;
export { loanAccountService as LoanAccountServiceInstance };
