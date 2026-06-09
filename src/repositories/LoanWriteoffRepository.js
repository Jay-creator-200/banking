import { BaseRepository } from './BaseRepository.js';
import LoanWriteoff from '../models/LoanWriteoff.js';

export class LoanWriteoffRepository extends BaseRepository {
  constructor() {
    super(LoanWriteoff);
  }

  async findByLoan(loanId) {
    return this.model.findOne({ loanId, isDeleted: false }).exec();
  }
}

const loanWriteoffRepository = new LoanWriteoffRepository();
export default loanWriteoffRepository;
