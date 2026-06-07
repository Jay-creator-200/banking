import BaseService from './BaseService.js';
import accountHeadRepository from '../repositories/AccountHeadRepository.js';
import { createAccountHeadSchema, updateAccountHeadSchema } from '../schemas/account-head.schema.js';
import { AppError } from '../utils/error-handler.js';

export class AccountHeadService extends BaseService {
  constructor() {
    super(accountHeadRepository);
  }

  /**
   * Create a new Account Head.
   *
   * @param {Object} data - Account Head data
   * @param {string} userId - Operator ID
   * @returns {Promise<import('mongoose').Document>}
   */
  async createAccountHead(data, userId) {
    try {
      // Validate schema
      const validatedData = this.validate(createAccountHeadSchema, data);
      
      // Ensure code is unique manually to give clean error
      const existing = await this.repository.findOne({ code: validatedData.code });
      if (existing) {
        throw AppError.conflict(`Account Head with code ${validatedData.code} already exists.`);
      }

      // If parent ID is provided, verify it exists
      if (validatedData.parentAccountId) {
        const parent = await this.repository.findById(validatedData.parentAccountId);
        if (!parent) {
          throw AppError.notFound('Parent Account Head not found.');
        }
      }

      return await this.create(validatedData, null, userId);
    } catch (error) {
      this.handleError(error, 'Failed to create Account Head');
    }
  }

  /**
   * Update an Account Head.
   *
   * @param {string} id - Account Head ID
   * @param {Object} data - Update data
   * @param {string} userId - Operator ID
   * @returns {Promise<import('mongoose').Document>}
   */
  async updateAccountHead(id, data, userId) {
    try {
      const validatedData = this.validate(updateAccountHeadSchema, data);

      if (validatedData.parentAccountId) {
        if (validatedData.parentAccountId === id) {
          throw AppError.validation('An account head cannot be its own parent.');
        }
        const parent = await this.repository.findById(validatedData.parentAccountId);
        if (!parent) {
          throw AppError.notFound('Parent Account Head not found.');
        }
      }

      return await this.update(id, validatedData, null, userId);
    } catch (error) {
      this.handleError(error, 'Failed to update Account Head');
    }
  }

  /**
   * Fetch hierarchical Chart of Accounts tree.
   *
   * @returns {Promise<Array<Object>>} List of top-level nodes with their populated child arrays.
   */
  async getChartOfAccounts() {
    try {
      const response = await this.repository.findMany({}, { limit: 1000, sort: 'code' });
      const docs = response.docs;

      // Group by parentAccountId
      const map = {};
      const roots = [];

      docs.forEach((doc) => {
        const item = doc.toObject ? doc.toObject() : doc;
        item.children = [];
        map[item._id.toString()] = item;
      });

      docs.forEach((doc) => {
        const item = map[doc._id.toString()];
        if (item.parentAccountId) {
          const parent = map[item.parentAccountId.toString()];
          if (parent) {
            parent.children.push(item);
          } else {
            // Parent not in map or is deleted
            roots.push(item);
          }
        } else {
          roots.push(item);
        }
      });

      return roots;
    } catch (error) {
      this.handleError(error, 'Failed to retrieve Chart of Accounts tree');
    }
  }
}

const accountHeadServiceInstance = new AccountHeadService();
export default accountHeadServiceInstance;
export { accountHeadServiceInstance as AccountHeadServiceInstance };
