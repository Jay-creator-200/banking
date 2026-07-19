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
    const payload = { ...validated };

    if (payload.schemeCode) {
      payload.schemeCode = payload.schemeCode.toUpperCase().trim();
      const existing = await this.repository.findOne({ schemeCode: payload.schemeCode });
      if (existing && existing._id.toString() !== id.toString()) {
        throw AppError.conflict(`Scheme with code ${payload.schemeCode} already exists`);
      }
    }

    return this.update(id, payload, null, userId);
  }
}

const depositSchemeService = new DepositSchemeService();
export default depositSchemeService;
export { depositSchemeService as DepositSchemeServiceInstance };
