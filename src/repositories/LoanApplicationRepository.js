import { BaseRepository } from './BaseRepository.js';
import LoanApplication from '../models/LoanApplication.js';

export class LoanApplicationRepository extends BaseRepository {
  constructor() {
    super(LoanApplication);
  }

  async findByMember(memberId) {
    return this.model.find({ memberId, isDeleted: false }).sort('-createdAt').lean().exec();
  }

  async findByStatus(status, branchId = null) {
    const filter = { applicationStatus: status, isDeleted: false };
    if (branchId) filter.branchId = branchId;
    return this.model.find(filter).sort('-createdAt').lean().exec();
  }
}

const loanApplicationRepository = new LoanApplicationRepository();
export default loanApplicationRepository;
