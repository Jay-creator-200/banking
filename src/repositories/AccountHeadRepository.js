import BaseRepository from './BaseRepository.js';
import AccountHead from '../models/AccountHead.js';

export class AccountHeadRepository extends BaseRepository {
  constructor() {
    super(AccountHead);
  }

  /**
   * Find account head with parent details.
   *
   * @param {string} id - AccountHead ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('parentAccountId')
      .exec();
  }
}

const accountHeadRepositoryInstance = new AccountHeadRepository();
export default accountHeadRepositoryInstance;
export { accountHeadRepositoryInstance as AccountHeadRepositoryInstance };
