import { BaseRepository } from './BaseRepository.js';
import VaultTransaction from '../models/VaultTransaction.js';
import mongoose from 'mongoose';

export class VaultTransactionRepository extends BaseRepository {
  constructor() {
    super(VaultTransaction);
  }

  /**
   * Get total vault balance for a branch (cumulative sum of all movements).
   *
   * @param {string} branchId - Branch ID
   * @returns {Promise<number>} Current vault balance
   */
  async getCurrentVaultBalance(branchId) {
    const result = await this.model.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId) } },
      {
        $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $eq: ['$transactionType', 'VAULT_IN'] }, '$amount', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$transactionType', 'VAULT_OUT'] }, '$amount', 0] } },
        },
      },
    ]);
    const row = result[0] || { totalIn: 0, totalOut: 0 };
    return row.totalIn - row.totalOut;
  }

  /**
   * Get latest vault balance for a branch from the last transaction.
   *
   * @param {string} branchId - Branch ID
   * @returns {Promise<number>}
   */
  async getLatestVaultBalance(branchId) {
    const last = await this.model
      .findOne({ branchId })
      .sort('-createdAt')
      .select('vaultBalanceAfter')
      .exec();
    return last?.vaultBalanceAfter || 0;
  }
}

const vaultTransactionRepository = new VaultTransactionRepository();
export default vaultTransactionRepository;
