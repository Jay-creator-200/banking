import { BaseRepository } from './BaseRepository.js';
import LoanPayment from '../models/LoanPayment.js';

export class LoanPaymentRepository extends BaseRepository {
  constructor() {
    super(LoanPayment);
  }

  async findByLoan(loanId) {
    return this.model.find({ loanId, isDeleted: false }).sort('-paymentDate').lean().exec();
  }

  async getPaymentSummary(loanId) {
    const result = await this.model.aggregate([
      { $match: { loanId: typeof loanId === 'string' ? loanId : loanId, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amount' },
          totalPrincipal: { $sum: '$principalCollected' },
          totalInterest: { $sum: '$interestCollected' },
          totalPenalty: { $sum: '$penaltyCollected' },
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0] || { totalPaid: 0, totalPrincipal: 0, totalInterest: 0, totalPenalty: 0, count: 0 };
  }
}

const loanPaymentRepository = new LoanPaymentRepository();
export default loanPaymentRepository;
