import BaseService from './BaseService.js';
import loanWriteoffRepository from '../repositories/LoanWriteoffRepository.js';
import loanRepository from '../repositories/LoanRepository.js';
import approvalService from './ApprovalService.js';
import auditLogService from './AuditLogService.js';
import { writeoffSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LoanWriteoffService extends BaseService {
  constructor() {
    super(loanWriteoffRepository);
  }

  /**
   * Initiate a write-off request (queues for approval).
   */
  async initiateWriteoff(data, userId) {
    const validated = this.validate(writeoffSchema, data);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const loan = await loanRepository.model.findById(validated.loanId).session(session);
      if (!loan) throw AppError.notFound('Loan not found');
      if (!['active', 'overdue'].includes(loan.loanStatus)) {
        throw AppError.validation('Only active or overdue loans can be written off');
      }

      // Check no pending write-off
      const existing = await loanWriteoffRepository.findByLoan(validated.loanId);
      if (existing && existing.writeoffStatus === 'pending') {
        throw AppError.conflict('A write-off request is already pending for this loan');
      }

      const writeoff = await loanWriteoffRepository.create({
        loanId: loan._id,
        outstandingAmount: loan.outstandingPrincipal + loan.outstandingInterest + loan.overdueAmount,
        principalOutstanding: loan.outstandingPrincipal,
        interestOutstanding: loan.outstandingInterest,
        penaltyOutstanding: loan.overdueAmount,
        writeoffReason: validated.writeoffReason,
        remarks: validated.remarks,
        writeoffStatus: 'pending',
        createdBy: userId,
        updatedBy: userId,
      }, { session });

      // Create approval request
      const approval = await approvalService.createApproval({
        moduleName: 'LOAN_WRITEOFF',
        referenceCollection: 'LoanWriteoff',
        referenceId: writeoff._id.toString(),
        requestType: 'CREATE',
      }, userId, session);

      writeoff.approvalRequestId = approval._id;
      await writeoff.save({ session });

      await auditLogService.log({
        userId,
        action: 'LOAN_WRITEOFF_INITIATED',
        module: 'LOAN',
        entityId: loan._id.toString(),
        description: `Write-off initiated for loan ${loan.loanNo}. Amount: ₹${writeoff.outstandingAmount}`,
      });

      await session.commitTransaction();
      session.endSession();
      return writeoff;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to initiate write-off');
    }
  }

  /**
   * Called by ApprovalService after write-off is approved.
   */
  async executeWriteoff(writeoffId, userId, session = null) {
    const writeoff = await loanWriteoffRepository.findById(writeoffId);
    if (!writeoff) throw AppError.notFound('Write-off record not found');

    const { LoanAccountServiceInstance } = await import('./LoanAccountService.js');
    await LoanAccountServiceInstance.writeoffLoan(writeoff.loanId, userId, session);

    writeoff.writeoffStatus = 'approved';
    writeoff.approvedBy = userId;
    writeoff.writeoffDate = new Date();
    writeoff.updatedBy = userId;
    await writeoff.save({ session });

    return writeoff;
  }

  async listWriteoffs(filters = {}, options = {}) {
    const query = { isDeleted: false };
    if (filters.writeoffStatus) query.writeoffStatus = filters.writeoffStatus;
    return this.repository.findMany(query, {
      ...options,
      populate: [{ path: 'loanId', select: 'loanNo memberId' }, { path: 'approvedBy', select: 'name' }],
      sort: '-createdAt',
    });
  }
}

const loanWriteoffService = new LoanWriteoffService();
export default loanWriteoffService;
export { loanWriteoffService as LoanWriteoffServiceInstance };
