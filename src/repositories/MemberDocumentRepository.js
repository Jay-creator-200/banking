import BaseRepository from './BaseRepository.js';
import MemberDocument from '../models/MemberDocument.js';
import '../models/Member.js';
import '../models/User.js';

export class MemberDocumentRepository extends BaseRepository {
  constructor() {
    super(MemberDocument);
  }

  /**
   * Find document with populated member and user details.
   *
   * @param {string} id - Document ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('memberId')
      .populate('verifiedBy', 'fullName email username')
      .exec();
  }
}

const memberDocumentRepositoryInstance = new MemberDocumentRepository();
export default memberDocumentRepositoryInstance;
export { memberDocumentRepositoryInstance as MemberDocumentRepositoryInstance };
