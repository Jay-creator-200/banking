import BaseService from './BaseService.js';
import loanGuarantorRepository from '../repositories/LoanGuarantorRepository.js';
import { addGuarantorSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';

export class GuarantorService extends BaseService {
  constructor() {
    super(loanGuarantorRepository);
  }

  async addGuarantor(data, userId) {
    const validated = this.validate(addGuarantorSchema, data);
    return this.repository.create({ ...validated, createdBy: userId, updatedBy: userId });
  }

  async getByApplication(loanApplicationId) {
    return this.repository.findByApplication(loanApplicationId);
  }

  async updateStatus(id, status, userId) {
    const g = await this.repository.findById(id);
    if (!g) throw AppError.notFound('Guarantor record not found');
    g.guarantorStatus = status;
    g.updatedBy = userId;
    return g.save();
  }

  async remove(id, userId) {
    return this.delete(id, userId);
  }
}

const guarantorService = new GuarantorService();
export default guarantorService;
export { guarantorService as GuarantorServiceInstance };
