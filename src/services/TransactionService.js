import BaseService from './BaseService.js';
import transactionRepository from '../repositories/TransactionRepository.js';
import sequenceService from './SequenceService.js';
import approvalService from './ApprovalService.js';
import ledgerService from './LedgerService.js';
import approvalRequestRepository from '../repositories/ApprovalRequestRepository.js';
import { createTransactionSchema } from '../schemas/transaction.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';
import cashSessionService from './CashSessionService.js';

export class TransactionService extends BaseService {
  constructor() {
    super(transactionRepository);
  }

  /**
   * Create a transaction in PENDING state and queue for approval.
   *
   * @param {Object} data - Transaction details payload
   * @param {string} userId - Requesting operator user ID
   * @returns {Promise<import('mongoose').Document>} PENDING Transaction record
   */
  async createTransaction(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Validate schema
      const validatedData = this.validate(createTransactionSchema, data);

      // Generate sequence number atomically
      const transactionNo = await sequenceService.generateTransactionNo(validatedData.branchId, session);

      // Check for savings withdrawal hold
      if (validatedData.transactionType === 'SAVINGS_WITHDRAWAL') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: validatedData.accountId }).session(session);
        if (!account) {
          throw AppError.notFound('Savings account not found');
        }
        if (account.status !== 'active') {
          throw AppError.validation(`Savings account is not active (current status: ${account.status})`);
        }
        if (account.availableBalance - validatedData.amount < account.minimumBalance) {
          throw AppError.validation(`Insufficient available balance. Required minimum balance: ₹${account.minimumBalance}`);
        }
        account.availableBalance -= validatedData.amount;
        account.updatedBy = userId;
        await account.save({ session });
      }

      // Create PENDING transaction
      const transaction = await this.repository.create(
        {
          ...validatedData,
          transactionNo,
          status: 'PENDING',
          createdBy: userId,
          updatedBy: userId,
        },
        { session }
      );

      // Queue an approval request
      await approvalService.createApproval(
        {
          moduleName: 'TRANSACTION',
          referenceCollection: 'Transaction',
          referenceId: transaction._id,
          requestType: 'CREATE',
        },
        userId,
        session
      );

      await session.commitTransaction();
      session.endSession();

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to create transaction request');
    }
  }

  /**
   * Approve transaction (called via approval queue callback).
   *
   * @param {string} txnId - Transaction ID
   * @param {string} userId - Approving User ID
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Posted Transaction record
   */
  async approveTransaction(txnId, userId, session) {
    try {
      const transaction = await this.repository.findById(txnId);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'PENDING') {
        throw AppError.validation(`Transaction must be PENDING to approve. Current status: ${transaction.status}`);
      }

      // Update transaction status
      transaction.status = 'POSTED';
      transaction.approvedBy = userId;
      transaction.approvedAt = new Date();
      transaction.updatedBy = userId;
      await transaction.save({ session });

      // Post entries to Double-Entry Ledger
      await ledgerService.postTransaction(transaction, userId, session);

      // If this was a CASH transaction linked to a teller session, register it
      if (transaction.paymentMode === 'CASH' && transaction.sessionId) {
        try {
          const txnType = [
            'SAVINGS_DEPOSIT', 'MEMBERSHIP_FEE', 'SHARE_PURCHASE', 'LOAN_INSTALLMENT'
          ].includes(transaction.transactionType) ? 'deposit' : 'withdrawal';
          await cashSessionService.linkTransactionToSession(
            transaction.sessionId, transaction, txnType, session
          );
        } catch (sessionLinkErr) {
          // Non-fatal: log but don't block the approval
          console.error('[CashSession] Failed to link transaction to session:', sessionLinkErr.message);
        }
      }

      // Execute post-approval hooks for savings account
      if (transaction.transactionType === 'SAVINGS_DEPOSIT' || transaction.transactionType === 'INTEREST_CREDIT') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (!account) {
          throw AppError.notFound('Savings account not found');
        }
        account.currentBalance += transaction.amount;
        account.availableBalance += transaction.amount;
        account.updatedBy = userId;
        await account.save({ session });
        
        transaction.balanceAfter = account.currentBalance;
        await transaction.save({ session });
      } else if (transaction.transactionType === 'SAVINGS_WITHDRAWAL') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (!account) {
          throw AppError.notFound('Savings account not found');
        }
        account.currentBalance -= transaction.amount;
        account.updatedBy = userId;
        await account.save({ session });

        transaction.balanceAfter = account.currentBalance;
        await transaction.save({ session });
      }

      // Execute post-approval hook for share capital purchase
      if (transaction.transactionType === 'SHARE_PURCHASE' && transaction.sourceCollection === 'ShareCertificate') {
        const ShareCertificate = mongoose.model('ShareCertificate');
        const ShareLedger = mongoose.model('ShareLedger');
        await ShareCertificate.findByIdAndUpdate(transaction.sourceId, { status: 'active' }).session(session);
        await ShareLedger.findOneAndUpdate({ transactionId: transaction._id }, { status: 'active' }).session(session);
      }

      return transaction;
    } catch (error) {
      this.handleError(error, 'Failed to approve and post transaction');
    }
  }

  /**
   * Reject transaction (called via approval queue callback).
   *
   * @param {string} txnId - Transaction ID
   * @param {string} userId - Approver ID
   * @param {string} remarks - Reject remarks
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Cancelled Transaction record
   */
  async rejectTransaction(txnId, userId, remarks, session) {
    try {
      const transaction = await this.repository.findById(txnId);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'PENDING') {
        throw AppError.validation('Transaction is not in PENDING state');
      }

      transaction.status = 'CANCELLED';
      transaction.approvedBy = userId;
      transaction.approvedAt = new Date();
      transaction.updatedBy = userId;
      if (remarks) {
        transaction.narration = `${transaction.narration || ''} (Rejected: ${remarks})`.trim();
      }
      await transaction.save({ session });

      // Release hold on available balance if it was a savings withdrawal
      if (transaction.transactionType === 'SAVINGS_WITHDRAWAL') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (account) {
          account.availableBalance += transaction.amount;
          account.updatedBy = userId;
          await account.save({ session });
        }
      }

      return transaction;
    } catch (error) {
      this.handleError(error, 'Failed to reject transaction');
    }
  }

  /**
   * Cancel transaction request (initiated by maker before approval action).
   *
   * @param {string} txnId - Transaction ID
   * @param {string} userId - Maker User ID
   * @param {string} [reason] - Reason for cancellation
   * @returns {Promise<import('mongoose').Document>} Cancelled Transaction record
   */
  async cancelTransaction(txnId, userId, reason = '') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const transaction = await this.repository.findById(txnId);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'PENDING') {
        throw AppError.validation('Only pending transactions can be cancelled');
      }
      if (transaction.createdBy.toString() !== userId.toString()) {
        throw AppError.forbidden('Only the creator of the transaction request can cancel it');
      }

      // Update transaction status
      transaction.status = 'CANCELLED';
      transaction.updatedBy = userId;
      if (reason) {
        transaction.narration = `${transaction.narration || ''} (Cancelled: ${reason})`.trim();
      }
      await transaction.save({ session });

      // Release hold on available balance if it was a savings withdrawal
      if (transaction.transactionType === 'SAVINGS_WITHDRAWAL') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (account) {
          account.availableBalance += transaction.amount;
          account.updatedBy = userId;
          await account.save({ session });
        }
      }

      // Cancel associated approval request in queue
      const approval = await approvalRequestRepository.findOne({
        moduleName: 'TRANSACTION',
        referenceId: transaction._id,
        status: 'PENDING',
      });
      if (approval) {
        approval.status = 'REJECTED';
        approval.remarks = reason || 'Cancelled by maker';
        approval.approvedBy = userId;
        approval.approvedAt = new Date();
        await approval.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to cancel transaction request');
    }
  }

  /**
   * Search transactions with query filters.
   *
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} docs and page summary
   */
  async getTransactions(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: ['branchId', 'approvedBy', 'createdBy'],
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to retrieve transactions');
    }
  }
}

const transactionServiceInstance = new TransactionService();
export default transactionServiceInstance;
export { transactionServiceInstance as TransactionServiceInstance };
