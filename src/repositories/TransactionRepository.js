import BaseRepository from './BaseRepository.js';
import Transaction from '../models/Transaction.js';
// Side-effects to prevent MissingSchemaError
import '../models/Branch.js';
import '../models/User.js';

export class TransactionRepository extends BaseRepository {
  constructor() {
    super(Transaction);
  }

  /**
   * Find a transaction with populated branch and user details.
   *
   * @param {string} id - Transaction ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('branchId')
      .populate('createdBy', 'fullName email username')
      .populate('approvedBy', 'fullName email username')
      .exec();
  }
}

const transactionRepositoryInstance = new TransactionRepository();
export default transactionRepositoryInstance;
export { transactionRepositoryInstance as TransactionRepositoryInstance };
