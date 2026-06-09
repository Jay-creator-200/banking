import { BaseRepository } from './BaseRepository.js';
import LoanCollateral from '../models/LoanCollateral.js';

export class LoanCollateralRepository extends BaseRepository {
  constructor() {
    super(LoanCollateral);
  }

  async findByApplication(loanApplicationId) {
    return this.model.find({ loanApplicationId, isDeleted: false }).lean().exec();
  }
}

const loanCollateralRepository = new LoanCollateralRepository();
export default loanCollateralRepository;
