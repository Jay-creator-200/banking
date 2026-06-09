import { BaseRepository } from './BaseRepository.js';
import LoanProduct from '../models/LoanProduct.js';

export class LoanProductRepository extends BaseRepository {
  constructor() {
    super(LoanProduct);
  }

  async findActive() {
    return this.model.find({ isActive: true, isDeleted: false }).sort('productName').lean().exec();
  }
}

const loanProductRepository = new LoanProductRepository();
export default loanProductRepository;
