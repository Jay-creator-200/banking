import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import LedgerService from './LedgerService.js';
import ApprovalService from './ApprovalService.js';
import SequenceService from './SequenceService.js';
import auditLogService from './AuditLogService.js';
import { AppError } from '../utils/error-handler.js';

export class ExpenseService {
  /**
   * Create pending expense and initiate approval workflow
   */
  async createExpense(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Generate unique expense number atomically
      const branchId = data.branchId;
      const branch = await mongoose.model('Branch').findById(branchId).session(session);
      if (!branch) {
        throw AppError.notFound('Branch not found');
      }

      // Generate sequence code
      const seqNo = await SequenceService.generateVoucherNo(branchId, session);
      const expenseNo = `EXP-${branch.branchCode}-${Date.now().toString().slice(-6)}-${seqNo.slice(-3)}`;

      const expense = await Expense.create(
        [
          {
            ...data,
            expenseNo,
            approvalStatus: 'PENDING',
            createdBy: userId,
            updatedBy: userId,
          },
        ],
        { session }
      );

      const User = mongoose.model('User');
      const creator = await User.findById(userId).populate('roleId').session(session);
      const isSuperAdmin = creator?.roleId?.code === 'SUPER_ADMIN';

      if (isSuperAdmin) {
        // Direct auto-approval bypass for Super Admin
        await this.approveExpense(expense[0]._id, userId, session);
      } else {
        // Trigger approval request
        await ApprovalService.createApproval(
          {
            moduleName: 'EXPENSE',
            referenceCollection: 'Expense',
            referenceId: expense[0]._id,
            requestType: 'CREATE',
          },
          userId,
          session
        );
      }

      await session.commitTransaction();
      session.endSession();

      return expense[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Approve an expense (Called by Approval Engine checker callback)
   */
  async approveExpense(expenseId, approverId, session = null) {
    const internalSession = session || (await mongoose.startSession());
    if (!session) internalSession.startTransaction();

    try {
      const expense = await Expense.findById(expenseId).session(internalSession);
      if (!expense) {
        throw AppError.notFound('Expense not found');
      }
      if (expense.approvalStatus !== 'PENDING') {
        throw AppError.validation(`Expense is already ${expense.approvalStatus}`);
      }

      expense.approvalStatus = 'APPROVED';
      expense.updatedBy = approverId;
      await expense.save({ session: internalSession });

      // Log Audit Event
      await auditLogService.logAction(
        approverId,
        'EXPENSE',
        'EXPENSE_APPROVED',
        'Expense',
        expense._id,
        { status: 'PENDING' },
        { status: 'APPROVED' }
      );

      if (!session) {
        await internalSession.commitTransaction();
        internalSession.endSession();
      }
    } catch (error) {
      if (!session) {
        await internalSession.abortTransaction();
        internalSession.endSession();
      }
      throw error;
    }
  }

  /**
   * Execute Expense Payment and generate double-entry Accounting posting
   */
  async payExpense(expenseId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const expense = await Expense.findById(expenseId).session(session);
      if (!expense) {
        throw AppError.notFound('Expense not found');
      }
      if (expense.approvalStatus !== 'APPROVED') {
        throw AppError.validation(`Cannot pay expense. Current approval status: ${expense.approvalStatus}. Required: APPROVED.`);
      }

      // Identify Cash/Bank account head to credit
      const creditHeadCode = expense.paymentMode === 'CASH' ? '11001' : '11002';
      const creditHead = await mongoose.model('AccountHead').findOne({ code: creditHeadCode }).session(session);
      if (!creditHead) {
        throw AppError.notFound(`Account head code ${creditHeadCode} (Cash/Bank) not found in Chart of Accounts.`);
      }

      // Trigger accounting posting
      const voucherPayload = {
        voucherDate: new Date(),
        voucherType: expense.paymentMode === 'CASH' ? 'PAYMENT' : 'JOURNAL',
        branchId: expense.branchId,
        narration: `Payment for Expense: ${expense.expenseNo} - ${expense.description || ''}`,
        entries: [
          {
            accountHeadId: expense.accountHeadId,
            debit: expense.amount,
            credit: 0,
            narration: expense.description,
          },
          {
            accountHeadId: creditHead._id,
            debit: 0,
            credit: expense.amount,
            narration: expense.description,
          },
        ],
      };

      const voucher = await LedgerService.createVoucher(voucherPayload, userId, session);

      // Mark expense as PAID and associate voucher
      expense.approvalStatus = 'PAID';
      expense.voucherId = voucher._id;
      expense.updatedBy = userId;
      await expense.save({ session });

      // Log Audit Event
      await auditLogService.logAction(
        userId,
        'EXPENSE',
        'EXPENSE_PAID',
        'Expense',
        expense._id,
        { status: 'APPROVED' },
        { status: 'PAID', voucherId: voucher._id }
      );

      await session.commitTransaction();
      session.endSession();

      return expense;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

const expenseServiceInstance = new ExpenseService();
export default expenseServiceInstance;
export { expenseServiceInstance as ExpenseServiceInstance };
