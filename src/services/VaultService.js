import BaseService from './BaseService.js';
import vaultTransactionRepository from '../repositories/VaultTransactionRepository.js';
import sequenceService from './SequenceService.js';
import auditLogService from './AuditLogService.js';
import { createVaultTransactionSchema } from '../schemas/cash.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class VaultService extends BaseService {
  constructor() {
    super(vaultTransactionRepository);
  }

  /**
   * Manually post a vault transaction (e.g., cash received from head office or external deposit).
   *
   * @param {Object} data - Vault transaction data
   * @param {string} userId - Operator User ID
   * @returns {Promise<import('mongoose').Document>} VaultTransaction
   */
  async postVaultTransaction(data, userId) {
    const validated = this.validate(createVaultTransactionSchema, data);

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const currentBalance = await vaultTransactionRepository.getLatestVaultBalance(validated.branchId);

      if (validated.transactionType === 'VAULT_OUT' && currentBalance < validated.amount) {
        throw AppError.validation(
          `Insufficient vault balance. Available: ₹${currentBalance.toLocaleString('en-IN')}, Requested: ₹${validated.amount.toLocaleString('en-IN')}`
        );
      }

      const vaultTxnNo = await sequenceService.generateSequence('VT', validated.branchId, mongoSession);

      const newBalance =
        validated.transactionType === 'VAULT_IN'
          ? currentBalance + validated.amount
          : currentBalance - validated.amount;

      const vtxn = await vaultTransactionRepository.create(
        {
          vaultTxnNo,
          branchId: validated.branchId,
          transactionDate: new Date(),
          transactionType: validated.transactionType,
          amount: validated.amount,
          vaultBalanceBefore: currentBalance,
          vaultBalanceAfter: newBalance,
          narration: validated.narration,
          createdBy: userId,
          updatedBy: userId,
        },
        { session: mongoSession }
      );

      await auditLogService.logAction(
        userId,
        'VAULT',
        validated.transactionType === 'VAULT_IN' ? 'VAULT_DEPOSIT' : 'VAULT_WITHDRAWAL',
        'VaultTransaction',
        vtxn._id,
        { balance: currentBalance },
        { balance: newBalance, amount: validated.amount }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return vtxn;
    } catch (error) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      this.handleError(error, 'Failed to post vault transaction');
    }
  }

  /**
   * Get current vault balance for a branch.
   *
   * @param {string} branchId - Branch ID
   * @returns {Promise<number>} Current vault balance
   */
  async getVaultBalance(branchId) {
    try {
      return await vaultTransactionRepository.getLatestVaultBalance(branchId);
    } catch (error) {
      this.handleError(error, 'Failed to fetch vault balance');
    }
  }

  /**
   * Get vault transaction history with filters.
   *
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>}
   */
  async getVaultTransactions(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: ['branchId', 'createdBy'],
        sort: '-createdAt',
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to retrieve vault transactions');
    }
  }
}

const vaultServiceInstance = new VaultService();
export default vaultServiceInstance;
export { vaultServiceInstance as VaultServiceInstance };
