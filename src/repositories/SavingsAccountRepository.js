import BaseRepository from './BaseRepository.js';
import SavingsAccount from '../models/SavingsAccount.js';
// Prevent mongoose MissingSchemaErrors by importing referenced models
import '../models/Member.js';
import '../models/Branch.js';
import '../models/User.js';

export class SavingsAccountRepository extends BaseRepository {
  constructor() {
    super(SavingsAccount);
  }

  /**
   * Find details by account ID, populating Member and Branch records.
   *
   * @param {string} id - Database account ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('memberId')
      .populate('branchId')
      .populate('closedBy', 'fullName username')
      .exec();
  }

  /**
   * Find details by Account Number, populating Member and Branch records.
   *
   * @param {string} accountNo - Account number string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailByAccountNo(accountNo) {
    return this.model
      .findOne({ accountNo: String(accountNo).toUpperCase().trim() })
      .populate('memberId')
      .populate('branchId')
      .exec();
  }
}

const savingsAccountRepositoryInstance = new SavingsAccountRepository();
export default savingsAccountRepositoryInstance;
export { savingsAccountRepositoryInstance as SavingsAccountRepositoryInstance };
