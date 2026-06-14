import BaseRepository from './BaseRepository.js';
import FDAccount from '../models/FDAccount.js';
import '../models/Member.js';
import '../models/Branch.js';
import '../models/DepositScheme.js';

export class FDAccountRepository extends BaseRepository {
  constructor() {
    super(FDAccount);
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

const fdAccountRepositoryInstance = new FDAccountRepository();
export default fdAccountRepositoryInstance;
export { fdAccountRepositoryInstance as FDAccountRepositoryInstance };
