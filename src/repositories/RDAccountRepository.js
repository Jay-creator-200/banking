import BaseRepository from './BaseRepository.js';
import RDAccount from '../models/RDAccount.js';
import '../models/Member.js';
import '../models/Branch.js';
import '../models/DepositScheme.js';

export class RDAccountRepository extends BaseRepository {
  constructor() {
    super(RDAccount);
  }

  async findDetailById(id) {
    return this.model
      .findById(id)
      .populate('memberId')
      .populate('branchId')
      .populate('schemeId')
      .exec();
  }
}

const rdAccountRepositoryInstance = new RDAccountRepository();
export default rdAccountRepositoryInstance;
export { rdAccountRepositoryInstance as RDAccountRepositoryInstance };
