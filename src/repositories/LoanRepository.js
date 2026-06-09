import { BaseRepository } from './BaseRepository.js';
import Loan from '../models/Loan.js';
import mongoose from 'mongoose';

export class LoanRepository extends BaseRepository {
  constructor() {
    super(Loan);
  }

  async findByMember(memberId) {
    return this.model
      .find({ memberId, isDeleted: false })
      .populate('loanProductId', 'productName productCode interestType')
      .sort('-createdAt')
      .lean()
      .exec();
  }

  async findOverdueLoans(branchId = null) {
    const filter = { loanStatus: { $in: ['active', 'overdue'] }, nextDueDate: { $lt: new Date() }, isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);
    return this.model.find(filter).populate('memberId', 'fullName memberNo mobile').sort('nextDueDate').lean().exec();
  }

  async findByBranch(branchId, status = null) {
    const filter = { branchId, isDeleted: false };
    if (status) filter.loanStatus = status;
    return this.model.find(filter).sort('-createdAt').lean().exec();
  }
}

const loanRepository = new LoanRepository();
export default loanRepository;
