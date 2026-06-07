import BaseRepository from './BaseRepository.js';
import Member from '../models/Member.js';
// Side-effect imports to prevent MissingSchemaError
import '../models/Branch.js';

export class MemberRepository extends BaseRepository {
  constructor() {
    super(Member);
  }

  /**
   * Find member with populated branch details.
   *
   * @param {string} id - Member ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('branchId')
      .exec();
  }
}

const memberRepositoryInstance = new MemberRepository();
export default memberRepositoryInstance;
export { memberRepositoryInstance as MemberRepositoryInstance };
