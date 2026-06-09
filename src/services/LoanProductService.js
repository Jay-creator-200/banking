import BaseService from './BaseService.js';
import loanProductRepository from '../repositories/LoanProductRepository.js';
import { createLoanProductSchema, updateLoanProductSchema } from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';

export class LoanProductService extends BaseService {
  constructor() {
    super(loanProductRepository);
  }

  async createProduct(data, userId) {
    const validated = this.validate(createLoanProductSchema, data);
    if (validated.minimumAmount > validated.maximumAmount) {
      throw AppError.validation('Minimum amount cannot exceed maximum amount');
    }
    if (validated.minimumTenure > validated.maximumTenure) {
      throw AppError.validation('Minimum tenure cannot exceed maximum tenure');
    }
    return this.repository.create({ ...validated, createdBy: userId, updatedBy: userId });
  }

  async updateProduct(id, data, userId) {
    const validated = this.validate(updateLoanProductSchema, data);
    const product = await this.repository.findById(id);
    if (!product) throw AppError.notFound('Loan product not found');
    Object.assign(product, validated, { updatedBy: userId });
    return product.save();
  }

  async toggleStatus(id, userId) {
    const product = await this.repository.findById(id);
    if (!product) throw AppError.notFound('Loan product not found');
    product.isActive = !product.isActive;
    product.updatedBy = userId;
    return product.save();
  }

  async listProducts(filter = {}, options = {}) {
    const query = { isDeleted: false, ...filter };
    return this.repository.findMany(query, options);
  }

  async getProduct(id) {
    const product = await this.repository.findById(id);
    if (!product) throw AppError.notFound('Loan product not found');
    return product;
  }
}

const loanProductService = new LoanProductService();
export default loanProductService;
export { loanProductService as LoanProductServiceInstance };
