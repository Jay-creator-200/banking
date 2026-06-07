import BaseRepository from './BaseRepository.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
// Side-effect imports
import '../models/User.js';

export class ApprovalRequestRepository extends BaseRepository {
  constructor() {
    super(ApprovalRequest);
  }

  /**
   * Find details of approval request.
   *
   * @param {string} id - Approval request ID.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('requestedBy', 'fullName email username')
      .populate('approvedBy', 'fullName email username')
      .exec();
  }
}

const approvalRequestRepositoryInstance = new ApprovalRequestRepository();
export default approvalRequestRepositoryInstance;
export { approvalRequestRepositoryInstance as ApprovalRequestRepositoryInstance };
