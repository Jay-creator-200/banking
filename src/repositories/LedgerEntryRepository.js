import BaseRepository from './BaseRepository.js';
import LedgerEntry from '../models/LedgerEntry.js';
// Side-effect imports
import '../models/JournalVoucher.js';
import '../models/Transaction.js';
import '../models/AccountHead.js';
import '../models/Branch.js';

export class LedgerEntryRepository extends BaseRepository {
  constructor() {
    super(LedgerEntry);
  }

  /**
   * Find details of ledger entry.
   *
   * @param {string} id - Ledger entry ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('voucherId')
      .populate('transactionId')
      .populate('accountHeadId')
      .populate('branchId')
      .exec();
  }
}

const ledgerEntryRepositoryInstance = new LedgerEntryRepository();
export default ledgerEntryRepositoryInstance;
export { ledgerEntryRepositoryInstance as LedgerEntryRepositoryInstance };
