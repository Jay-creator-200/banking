import { BaseRepository } from './BaseRepository.js';
import LoanSchedule from '../models/LoanSchedule.js';

export class LoanScheduleRepository extends BaseRepository {
  constructor() {
    super(LoanSchedule);
  }

  async findByLoan(loanId) {
    return this.model.find({ loanId, isDeleted: false }).sort('installmentNo').lean().exec();
  }

  async findPendingInstallments(loanId) {
    return this.model
      .find({ loanId, paymentStatus: { $in: ['pending', 'partial', 'overdue'] }, isDeleted: false })
      .sort('installmentNo')
      .lean()
      .exec();
  }

  async findOverdueInstallments(loanId) {
    return this.model
      .find({ loanId, paymentStatus: 'overdue', isDeleted: false })
      .sort('installmentNo')
      .lean()
      .exec();
  }

  async findNextDue(loanId) {
    return this.model
      .findOne({ loanId, paymentStatus: { $in: ['pending', 'partial', 'overdue'] }, isDeleted: false })
      .sort('installmentNo')
      .exec();
  }
}

const loanScheduleRepository = new LoanScheduleRepository();
export default loanScheduleRepository;
