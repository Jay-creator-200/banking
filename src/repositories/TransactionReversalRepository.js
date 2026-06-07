import BaseRepository from './BaseRepository.js';
import TransactionReversal from '../models/TransactionReversal.js';
// Side-effect imports
import '../models/Transaction.js';
import '../models/User.js';

export class TransactionReversalRepository extends BaseRepository {
  constructor() {
    super(TransactionReversal);
  }

  /**
   * Find detailed reversal request.
   *
   * @param {string} id - Reversal request ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate({
        path: 'transactionId',
        populate: { path: 'branchId' }
      })
      .populate('requestedBy', 'fullName email username')
      .populate('approvedBy', 'fullName email username')
      .exec();
  }
}

const transactionReversalRepositoryInstance = new TransactionReversalRepository();
export default transactionReversalRepositoryInstance;
export { transactionReversalRepositoryInstance as TransactionReversalRepositoryInstance };
