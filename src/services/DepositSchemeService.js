import BaseService from './BaseService.js';
import depositSchemeRepository from '../repositories/DepositSchemeRepository.js';
import { createDepositSchemeSchema, updateDepositSchemeSchema } from '../schemas/deposit.schema.js';
import { AppError } from '../utils/error-handler.js';

export class DepositSchemeService extends BaseService {
  constructor() {
    super(depositSchemeRepository);
  }

  async createScheme(data, userId) {
    const validated = this.validate(createDepositSchemeSchema, data);
    
    // Check duplicate scheme code
    const existing = await this.repository.findOne({ schemeCode: validated.schemeCode.toUpperCase().trim() });
    if (existing) {
      throw AppError.conflict(`Scheme with code ${validated.schemeCode} already exists`);
    }

    return this.create({
      ...validated,
      schemeCode: validated.schemeCode.toUpperCase().trim(),
    }, null, userId);
  }

  async updateScheme(id, data, userId) {
    const validated = this.validate(updateDepositSchemeSchema, data);
    return this.update(id, validated, null, userId);
  }
}

const depositSchemeService = new DepositSchemeService();
export default depositSchemeService;
export { depositSchemeService as DepositSchemeServiceInstance };
