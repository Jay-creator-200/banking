import { BaseRepository } from './BaseRepository.js';
import LoanGuarantor from '../models/LoanGuarantor.js';

export class LoanGuarantorRepository extends BaseRepository {
  constructor() {
    super(LoanGuarantor);
  }

  async findByApplication(loanApplicationId) {
    return this.model.find({ loanApplicationId, isDeleted: false }).lean().exec();
  }
}

const loanGuarantorRepository = new LoanGuarantorRepository();
export default loanGuarantorRepository;
