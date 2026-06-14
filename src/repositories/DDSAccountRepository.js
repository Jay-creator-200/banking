import BaseRepository from './BaseRepository.js';
import DDSAccount from '../models/DDSAccount.js';
import '../models/Member.js';
import '../models/Branch.js';
import '../models/DepositScheme.js';

export class DDSAccountRepository extends BaseRepository {
  constructor() {
    super(DDSAccount);
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

const ddsAccountRepositoryInstance = new DDSAccountRepository();
export default ddsAccountRepositoryInstance;
export { ddsAccountRepositoryInstance as DDSAccountRepositoryInstance };
