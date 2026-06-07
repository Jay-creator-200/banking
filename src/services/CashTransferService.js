import BaseService from './BaseService.js';
import cashTransferRepository from '../repositories/CashTransferRepository.js';
import cashSessionRepository from '../repositories/CashSessionRepository.js';
import vaultTransactionRepository from '../repositories/VaultTransactionRepository.js';
import sequenceService from './SequenceService.js';
import auditLogService from './AuditLogService.js';
import { createTransferSchema, approveTransferSchema } from '../schemas/cash.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class CashTransferService extends BaseService {
  constructor() {
    super(cashTransferRepository);
  }

  /**
   * Request a cash transfer (teller-to-teller or teller-to-vault or vault-to-teller).
   *
   * @param {Object} data - Transfer request payload
   * @param {string} userId - Requesting teller User ID
   * @returns {Promise<import('mongoose').Document>} CashTransfer
   */
  async requestTransfer(data, userId) {
    const validated = this.validate(createTransferSchema, data);

    // Validate source session exists and is open
    const fromSession = await cashSessionRepository.findById(validated.fromSessionId);
    if (!fromSession) {
      throw AppError.notFound('Source cash session not found');
    }
    if (fromSession.status !== 'open') {
      throw AppError.validation('Source session must be open to initiate a transfer');
    }

    // For teller-to-teller, validate the destination session
    if (validated.transferType === 'teller_to_teller') {
      if (!validated.toSessionId) {
        throw AppError.validation('Destination session is required for teller-to-teller transfer');
      }
      const toSession = await cashSessionRepository.findById(validated.toSessionId);
      if (!toSession || toSession.status !== 'open') {
        throw AppError.validation('Destination session must be open to receive a transfer');
      }
    }

    // Check teller has sufficient system balance
    if (fromSession.systemBalance < validated.amount) {
      throw AppError.validation(
        `Insufficient teller balance. Available: ₹${fromSession.systemBalance.toLocaleString('en-IN')}, Requested: ₹${validated.amount.toLocaleString('en-IN')}`
      );
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const transferNo = await sequenceService.generateSequence('CT', validated.branchId, mongoSession);

      const transfer = await cashTransferRepository.create(
        {
          transferNo,
          branchId: validated.branchId,
          fromSessionId: validated.fromSessionId,
          toSessionId: validated.toSessionId || null,
          transferType: validated.transferType,
          amount: validated.amount,
          status: 'pending',
          remarks: validated.remarks,
          createdBy: userId,
          updatedBy: userId,
        },
        { session: mongoSession }
      );

      await auditLogService.logAction(
        userId,
        'TELLER',
        'REQUEST_TRANSFER',
        'CashTransfer',
        transfer._id,
        null,
        { transferNo, amount: validated.amount, transferType: validated.transferType }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return transfer;
    } catch (error) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      this.handleError(error, 'Failed to request cash transfer');
    }
  }

  /**
   * Approve or reject a cash transfer.
   * On approval, adjusts both session system balances and creates vault transaction if applicable.
   *
   * @param {Object} data - Approval payload
   * @param {string} userId - Approver User ID
   * @returns {Promise<import('mongoose').Document>} Updated CashTransfer
   */
  async processTransfer(data, userId) {
    const validated = this.validate(approveTransferSchema, data);

    const transfer = await cashTransferRepository.findById(validated.transferId, ['fromSessionId', 'toSessionId']);
    if (!transfer) {
      throw AppError.notFound('Cash transfer not found');
    }
    if (transfer.status !== 'pending') {
      throw AppError.validation(`Transfer is already ${transfer.status}`);
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      if (validated.action === 'approve') {
        transfer.status = 'completed';
        transfer.approvedBy = userId;
        transfer.approvedAt = new Date();
        transfer.remarks = validated.remarks || transfer.remarks;
        transfer.updatedBy = userId;
        await transfer.save({ session: mongoSession });

        // Deduct from source session
        const fromSess = await cashSessionRepository.findById(transfer.fromSessionId);
        if (fromSess) {
          fromSess.systemBalance -= transfer.amount;
          fromSess.updatedBy = userId;
          await fromSess.save({ session: mongoSession });
        }

        // For vault operations, create vault transaction record
        if (transfer.transferType === 'teller_to_vault') {
          const currentVaultBalance = await vaultTransactionRepository.getLatestVaultBalance(transfer.branchId);
          const vaultTxnNo = await sequenceService.generateSequence('VT', transfer.branchId, mongoSession);
          await vaultTransactionRepository.create(
            {
              vaultTxnNo,
              branchId: transfer.branchId,
              transactionDate: new Date(),
              transactionType: 'VAULT_IN',
              amount: transfer.amount,
              vaultBalanceBefore: currentVaultBalance,
              vaultBalanceAfter: currentVaultBalance + transfer.amount,
              transferId: transfer._id,
              sessionId: transfer.fromSessionId,
              narration: `Transfer from teller session ${fromSess?.sessionNo || ''} to vault`,
              createdBy: userId,
              updatedBy: userId,
            },
            { session: mongoSession }
          );
        } else if (transfer.transferType === 'vault_to_teller') {
          const currentVaultBalance = await vaultTransactionRepository.getLatestVaultBalance(transfer.branchId);
          const vaultTxnNo = await sequenceService.generateSequence('VT', transfer.branchId, mongoSession);
          await vaultTransactionRepository.create(
            {
              vaultTxnNo,
              branchId: transfer.branchId,
              transactionDate: new Date(),
              transactionType: 'VAULT_OUT',
              amount: transfer.amount,
              vaultBalanceBefore: currentVaultBalance,
              vaultBalanceAfter: currentVaultBalance - transfer.amount,
              transferId: transfer._id,
              sessionId: transfer.toSessionId,
              narration: `Vault disbursement to teller session`,
              createdBy: userId,
              updatedBy: userId,
            },
            { session: mongoSession }
          );

          // Credit destination session
          if (transfer.toSessionId) {
            const toSess = await cashSessionRepository.findById(transfer.toSessionId);
            if (toSess) {
              toSess.systemBalance += transfer.amount;
              toSess.updatedBy = userId;
              await toSess.save({ session: mongoSession });
            }
          }
        } else if (transfer.transferType === 'teller_to_teller') {
          // Credit destination session
          if (transfer.toSessionId) {
            const toSess = await cashSessionRepository.findById(transfer.toSessionId);
            if (toSess) {
              toSess.systemBalance += transfer.amount;
              toSess.updatedBy = userId;
              await toSess.save({ session: mongoSession });
            }
          }
        }
      } else {
        // Reject
        transfer.status = 'rejected';
        transfer.approvedBy = userId;
        transfer.approvedAt = new Date();
        transfer.remarks = validated.remarks || 'Rejected';
        transfer.updatedBy = userId;
        await transfer.save({ session: mongoSession });
      }

      await auditLogService.logAction(
        userId,
        'TELLER',
        validated.action === 'approve' ? 'APPROVE_TRANSFER' : 'REJECT_TRANSFER',
        'CashTransfer',
        transfer._id,
        { status: 'pending' },
        { status: transfer.status, amount: transfer.amount }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return transfer;
    } catch (error) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      this.handleError(error, 'Failed to process cash transfer');
    }
  }

  /**
   * List transfers with filters and pagination.
   *
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>}
   */
  async getTransfers(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: ['fromSessionId', 'toSessionId', 'branchId', 'approvedBy', 'createdBy'],
        sort: '-createdAt',
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to retrieve cash transfers');
    }
  }
}

const cashTransferServiceInstance = new CashTransferService();
export default cashTransferServiceInstance;
export { cashTransferServiceInstance as CashTransferServiceInstance };
