import BaseService from './BaseService.js';
import loanCollateralRepository from '../repositories/LoanCollateralRepository.js';
import { addCollateralSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';

export class CollateralService extends BaseService {
  constructor() {
    super(loanCollateralRepository);
  }

  async addCollateral(data, userId) {
    const validated = this.validate(addCollateralSchema, data);
    return this.repository.create({ ...validated, createdBy: userId, updatedBy: userId });
  }

  async getByApplication(loanApplicationId) {
    return this.repository.findByApplication(loanApplicationId);
  }

  async updateVerification(id, verificationStatus, remarks, userId) {
    const c = await this.repository.findById(id);
    if (!c) throw AppError.notFound('Collateral record not found');
    c.verificationStatus = verificationStatus;
    if (remarks) c.remarks = remarks;
    c.updatedBy = userId;
    return c.save();
  }

  async remove(id, userId) {
    return this.delete(id, userId);
  }
}

const collateralService = new CollateralService();
export default collateralService;
export { collateralService as CollateralServiceInstance };
