import BaseService from './BaseService.js';
import transactionReversalRepository from '../repositories/TransactionReversalRepository.js';
import transactionRepository from '../repositories/TransactionRepository.js';
import approvalService from './ApprovalService.js';
import sequenceService from './SequenceService.js';
import ledgerService from './LedgerService.js';
import ledgerEntryRepository from '../repositories/LedgerEntryRepository.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class ReversalService extends BaseService {
  constructor() {
    super(transactionReversalRepository);
  }

  /**
   * Request a reversal for a posted transaction.
   *
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Reason for reversal
   * @param {string} userId - Requesting user
   * @returns {Promise<import('mongoose').Document>} Reversal request document
   */
  async requestReversal(transactionId, reason, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!reason || !reason.trim()) {
        throw AppError.validation('Reversal reason is required');
      }

      const transaction = await transactionRepository.findById(transactionId);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'POSTED') {
        throw AppError.validation(`Only POSTED transactions can be reversed. Current status: ${transaction.status}`);
      }

      // Check if there is already a pending reversal request for this transaction
      const existingPending = await this.repository.findOne({
        transactionId,
        status: 'PENDING',
      });
      if (existingPending) {
        throw AppError.conflict('A pending reversal request already exists for this transaction.');
      }

      // Create Reversal request record
      const reversalDoc = await this.repository.create(
        {
          transactionId,
          reason,
          requestedBy: userId,
          status: 'PENDING',
        },
        { session }
      );

      // Create Approval workflow record
      await approvalService.createApproval(
        {
          moduleName: 'REVERSAL',
          referenceCollection: 'TransactionReversal',
          referenceId: reversalDoc._id,
          requestType: 'REVERSAL',
        },
        userId,
        session
      );

      await session.commitTransaction();
      session.endSession();

      return reversalDoc;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to request transaction reversal');
    }
  }

  /**
   * Approve a reversal request (called via approval queue callback).
   *
   * @param {string} reversalId - Reversal request ID
   * @param {string} userId - Approver ID
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Approved reversal request
   */
  async approveReversal(reversalId, userId, session) {
    try {
      const reversal = await this.repository.findById(reversalId);
      if (!reversal) {
        throw AppError.notFound('Reversal request not found');
      }
      if (reversal.status !== 'PENDING') {
        throw AppError.validation('Reversal request is already processed');
      }

      const transaction = await transactionRepository.findById(reversal.transactionId);
      if (!transaction) {
        throw AppError.notFound('Original transaction not found');
      }
      if (transaction.status !== 'POSTED') {
        throw AppError.validation('Original transaction is not in POSTED state');
      }

      // Find original Journal Voucher associated with the transaction
      const origLedgerEntry = await ledgerEntryRepository.model
        .findOne({ transactionId: transaction._id })
        .session(session)
        .exec();
        
      if (!origLedgerEntry) {
        throw AppError.notFound('No postings found for the original transaction to reverse');
      }

      // Create Compensating Reversal Transaction in DB
      const reversalTxnNo = await sequenceService.generateTransactionNo(transaction.branchId, session);
      const compensatingTxn = await transactionRepository.create(
        {
          transactionNo: reversalTxnNo,
          branchId: transaction.branchId,
          memberId: transaction.memberId,
          accountType: transaction.accountType,
          accountId: transaction.accountId,
          transactionType: transaction.transactionType,
          paymentMode: transaction.paymentMode,
          amount: transaction.amount,
          referenceNo: transaction.transactionNo,
          narration: `REVERSAL compensating entry: ${reversal.reason}`,
          status: 'POSTED',
          createdBy: userId,
          approvedBy: userId,
          approvedAt: new Date(),
        },
        { session }
      );

      // Post Reversing Ledger Entries (Compensating Journal Voucher)
      const reversalVoucher = await ledgerService.reversePosting(origLedgerEntry.voucherId, userId, session);

      // Link compensating ledger entries to compensating transaction
      await ledgerEntryRepository.model.updateMany(
        { voucherId: reversalVoucher._id },
        { $set: { transactionId: compensatingTxn._id } },
        { session }
      );

      // Update original transaction status to REVERSED
      transaction.status = 'REVERSED';
      transaction.updatedBy = userId;
      await transaction.save({ session });

      // Update reversal request status
      reversal.status = 'APPROVED';
      reversal.approvedBy = userId;
      reversal.approvedAt = new Date();
      reversal.reversalTransactionId = compensatingTxn._id;
      await reversal.save({ session });

      return reversal;
    } catch (error) {
      this.handleError(error, 'Failed to approve transaction reversal');
    }
  }

  /**
   * Reject a reversal request.
   *
   * @param {string} reversalId - Reversal request ID
   * @param {string} userId - Approver ID
   * @param {string} remarks - Reject remarks
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Rejected reversal request
   */
  async rejectReversal(reversalId, userId, remarks, session) {
    try {
      const reversal = await this.repository.findById(reversalId);
      if (!reversal) {
        throw AppError.notFound('Reversal request not found');
      }
      if (reversal.status !== 'PENDING') {
        throw AppError.validation('Reversal request is already processed');
      }

      reversal.status = 'REJECTED';
      reversal.approvedBy = userId;
      reversal.approvedAt = new Date();
      reversal.remarks = remarks;
      await reversal.save({ session });

      return reversal;
    } catch (error) {
      this.handleError(error, 'Failed to reject transaction reversal');
    }
  }

  /**
   * Fetch reversal request details.
   *
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} docs and page count
   */
  async getReversals(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: [
          { path: 'transactionId', populate: { path: 'branchId' } },
          'requestedBy',
          'approvedBy',
        ],
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to query reversal list');
    }
  }
}

const reversalServiceInstance = new ReversalService();
export default reversalServiceInstance;
export { reversalServiceInstance as ReversalServiceInstance };
