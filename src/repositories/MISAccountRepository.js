import BaseRepository from './BaseRepository.js';
import MISAccount from '../models/MISAccount.js';
import '../models/Member.js';
import '../models/Branch.js';
import '../models/DepositScheme.js';

export class MISAccountRepository extends BaseRepository {
  constructor() {
    super(MISAccount);
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

const misAccountRepositoryInstance = new MISAccountRepository();
export default misAccountRepositoryInstance;
export { misAccountRepositoryInstance as MISAccountRepositoryInstance };
