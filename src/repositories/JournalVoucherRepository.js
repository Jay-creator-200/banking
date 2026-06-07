import BaseRepository from './BaseRepository.js';
import JournalVoucher from '../models/JournalVoucher.js';
// Side-effect imports
import '../models/Branch.js';
import '../models/User.js';

export class JournalVoucherRepository extends BaseRepository {
  constructor() {
    super(JournalVoucher);
  }

  /**
   * Find details of a journal voucher.
   *
   * @param {string} id - Voucher ID.
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

const journalVoucherRepositoryInstance = new JournalVoucherRepository();
export default journalVoucherRepositoryInstance;
export { journalVoucherRepositoryInstance as JournalVoucherRepositoryInstance };
