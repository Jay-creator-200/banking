import BaseService from './BaseService.js';
import approvalRequestRepository from '../repositories/ApprovalRequestRepository.js';
import { createApprovalSchema, approveSchema, rejectSchema } from '../schemas/approval.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class ApprovalService extends BaseService {
  constructor() {
    super(approvalRequestRepository);
  }

  /**
   * Create a new approval request.
   *
   * @param {Object} data - Approval payload
   * @param {string} userId - Requester User ID
   * @param {import('mongoose').ClientSession} [session] - Optional session
   * @returns {Promise<import('mongoose').Document>}
   */
  async createApproval(data, userId, session = null) {
    try {
      const validatedData = this.validate(createApprovalSchema, data);
      const payload = {
        ...validatedData,
        requestedBy: userId,
        status: 'PENDING',
      };
      return await this.repository.create(payload, { session });
    } catch (error) {
      this.handleError(error, 'Failed to initiate approval workflow');
    }
  }

  /**
   * Approve a pending request. Calls callbacks based on module.
   *
   * @param {string} approvalId - Approval request ID
   * @param {string} userId - Approver User ID
   * @param {Object} remarksData - Approval remarks
   * @returns {Promise<import('mongoose').Document>}
   */
  async approve(approvalId, userId, remarksData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const validated = this.validate(approveSchema, remarksData);
      
      const approval = await this.repository.findById(approvalId);
      if (!approval) {
        throw AppError.notFound('Approval request not found');
      }
      if (approval.status !== 'PENDING') {
        throw AppError.validation(`Approval request is already ${approval.status}`);
      }
      if (approval.requestedBy.toString() === userId.toString()) {
        throw AppError.validation('Maker cannot act as Checker. Self-approval is disabled.');
      }

      // Update approval record status
      approval.status = 'APPROVED';
      approval.approvedBy = userId;
      approval.approvedAt = new Date();
      approval.remarks = validated.remarks;
      await approval.save({ session });

      // Execute callback module action
      if (approval.moduleName === 'TRANSACTION') {
        const Transaction = mongoose.model('Transaction');
        const transaction = await Transaction.findById(approval.referenceId).session(session);
        if (transaction && transaction.transactionType === 'SAVINGS_WITHDRAWAL' && transaction.amount > 50000) {
          const User = mongoose.model('User');
          const approver = await User.findById(userId).populate('roleId').session(session);
          if (!approver || !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(approver.roleId.code)) {
            throw AppError.validation('Withdrawals above ₹50,000 require Branch Manager or Administrator approval.');
          }
        }
        const { TransactionServiceInstance } = await import('./TransactionService.js');
        await TransactionServiceInstance.approveTransaction(approval.referenceId, userId, session);
      } else if (approval.moduleName === 'REVERSAL') {
        const { ReversalServiceInstance } = await import('./ReversalService.js');
        await ReversalServiceInstance.approveReversal(approval.referenceId, userId, session);
      } else if (approval.moduleName === 'LOAN_WRITEOFF') {
        const { LoanWriteoffServiceInstance } = await import('./LoanWriteoffService.js');
        await LoanWriteoffServiceInstance.executeWriteoff(approval.referenceId, userId, session);
      } else if (approval.moduleName === 'EXPENSE') {
        const { ExpenseServiceInstance } = await import('./ExpenseService.js');
        await ExpenseServiceInstance.approveExpense(approval.referenceId, userId, session);
      }

      await session.commitTransaction();
      session.endSession();

      return approval;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to approve request');
    }
  }

  /**
   * Reject a pending request.
   *
   * @param {string} approvalId - Approval request ID
   * @param {string} userId - Approver User ID
   * @param {Object} remarksData - Rejection remarks
   * @returns {Promise<import('mongoose').Document>}
   */
  async reject(approvalId, userId, remarksData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const validated = this.validate(rejectSchema, remarksData);
      
      const approval = await this.repository.findById(approvalId);
      if (!approval) {
        throw AppError.notFound('Approval request not found');
      }
      if (approval.status !== 'PENDING') {
        throw AppError.validation(`Approval request is already ${approval.status}`);
      }
      if (approval.requestedBy.toString() === userId.toString()) {
        throw AppError.validation('Self-rejection/action is not permitted.');
      }

      // Update approval record status
      approval.status = 'REJECTED';
      approval.approvedBy = userId;
      approval.approvedAt = new Date();
      approval.remarks = validated.remarks;
      await approval.save({ session });

      // Execute callback module reject action
      if (approval.moduleName === 'TRANSACTION') {
        const { TransactionServiceInstance } = await import('./TransactionService.js');
        await TransactionServiceInstance.rejectTransaction(approval.referenceId, userId, validated.remarks, session);
      } else if (approval.moduleName === 'REVERSAL') {
        const { ReversalServiceInstance } = await import('./ReversalService.js');
        await ReversalServiceInstance.rejectReversal(approval.referenceId, userId, validated.remarks, session);
      } else if (approval.moduleName === 'LOAN_WRITEOFF') {
        // Mark write-off as rejected
        const LoanWriteoff = mongoose.model('LoanWriteoff');
        await LoanWriteoff.findByIdAndUpdate(approval.referenceId, {
          $set: { writeoffStatus: 'rejected', updatedBy: userId },
        }).session(session);
      } else if (approval.moduleName === 'EXPENSE') {
        const Expense = mongoose.model('Expense');
        await Expense.findByIdAndUpdate(approval.referenceId, {
          $set: { approvalStatus: 'REJECTED', updatedBy: userId },
        }).session(session);
      }

      await session.commitTransaction();
      session.endSession();

      return approval;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to reject request');
    }
  }

  /**
   * Get pending approvals for user (maker-checker validation).
   *
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} List of approvals
   */
  async getPendingApprovals(filters = {}, options = {}) {
    try {
      const query = { status: 'PENDING', ...filters };
      return await this.repository.findMany(query, {
        populate: ['requestedBy'],
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to fetch pending approvals');
    }
  }
}

const approvalServiceInstance = new ApprovalService();
export default approvalServiceInstance;
export { approvalServiceInstance as ApprovalServiceInstance };
