import { AppError } from '../utils/error-handler.js';

/**
 * Base Service class containing core business orchestration methods.
 * Coordinates input validation (Zod), repository transactions, and standardized errors.
 */
export class BaseService {
  /**
   * @param {import('../repositories/BaseRepository').BaseRepository} repository - The database repository for the entity.
   */
  constructor(repository) {
    if (!repository) {
      throw new Error('Repository instance is required to instantiate BaseService');
    }
    this.repository = repository;
  }

  /**
   * Validate data payload against a Zod schema.
   *
   * @param {import('zod').ZodSchema} schema - Zod validator.
   * @param {Object} data - Input payload.
   * @returns {Object} Validated and parsed data.
   * @throws {AppError} Formatted validation error if safeParse fails.
   */
  validate(schema, data) {
    const isPlainObject = (val) => {
      if (typeof val !== 'object' || val === null) return false;
      const proto = Object.getPrototypeOf(val);
      return proto === null || proto === Object.prototype;
    };
    const sanitize = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (isPlainObject(obj)) {
        const cleaned = {};
        for (const [key, val] of Object.entries(obj)) {
          cleaned[key] = val === '' ? undefined : sanitize(val);
        }
        return cleaned;
      }
      return obj;
    };
    const cleanedData = sanitize(data);
    const result = schema.safeParse(cleanedData);
    if (!result.success) {
      // Format validation errors to a structured key-value format
      const formattedErrors = result.error.flatten().fieldErrors;
      throw AppError.validation('Validation failed. Please verify your input parameters.', formattedErrors);
    }
    return result.data;
  }

  /**
   * Orchestrate record creation.
   *
   * @param {Object} data - Raw creation payload.
   * @param {import('zod').ZodSchema} [schema] - Optional validation schema.
   * @param {string} [userId='SYSTEM'] - Operator user ID.
   * @param {import('mongoose').SaveOptions} [options] - Saving options (like transactions/session).
   * @returns {Promise<import('mongoose').Document>}
   */
  async create(data, schema = null, userId = 'SYSTEM', options = {}) {
    try {
      const validatedData = schema ? this.validate(schema, data) : data;
      const payload = {
        ...validatedData,
        createdBy: userId,
        updatedBy: userId,
      };
      return await this.repository.create(payload, options);
    } catch (error) {
      this.handleError(error, 'Failed to create database record');
    }
  }

  /**
   * Orchestrate record update.
   *
   * @param {string} id - Target document ID.
   * @param {Object} data - Patch parameters.
   * @param {import('zod').ZodSchema} [schema] - Optional validation schema.
   * @param {string} [userId='SYSTEM'] - Operator user ID.
   * @param {import('mongoose').QueryOptions} [options] - Mongoose update settings.
   * @returns {Promise<import('mongoose').Document>}
   */
  async update(id, data, schema = null, userId = 'SYSTEM', options = {}) {
    try {
      const validatedData = schema ? this.validate(schema, data) : data;
      const payload = {
        ...validatedData,
        updatedBy: userId,
      };
      const record = await this.repository.update(id, payload, options);
      if (!record) {
        throw AppError.notFound('Requested record was not found or has been deleted');
      }
      return record;
    } catch (error) {
      this.handleError(error, 'Failed to update database record');
    }
  }

  /**
   * Orchestrate soft-delete.
   *
   * @param {string} id - Target document ID.
   * @param {string} [userId='SYSTEM'] - Operator user ID.
   * @param {import('mongoose').SaveOptions} [options] - Saving settings.
   * @returns {Promise<import('mongoose').Document>}
   */
  async delete(id, userId = 'SYSTEM', options = {}) {
    try {
      const record = await this.repository.delete(id, userId, options);
      if (!record) {
        throw AppError.notFound('Requested record was not found or has already been deleted');
      }
      return record;
    } catch (error) {
      this.handleError(error, 'Failed to delete database record');
    }
  }

  /**
   * Retrieve a single record by its ID.
   *
   * @param {string} id - Document ID.
   * @param {Array<string|Object>} [populate=[]] - DB references to populate.
   * @param {string} [select=''] - Space-separated fields list to return.
   * @returns {Promise<import('mongoose').Document>}
   */
  async findById(id, populate = [], select = '') {
    try {
      const record = await this.repository.findById(id, populate, select);
      if (!record) {
        throw AppError.notFound('Requested record was not found');
      }
      return record;
    } catch (error) {
      this.handleError(error, 'Failed to fetch database record by ID');
    }
  }

  /**
   * Find a single record matching the query filter.
   *
   * @param {Object} [filter={}] - Match filter.
   * @param {Array<string|Object>} [populate=[]] - DB fields to populate.
   * @param {string} [select=''] - Space-separated fields list.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findOne(filter = {}, populate = [], select = '') {
    try {
      return await this.repository.findOne(filter, populate, select);
    } catch (error) {
      this.handleError(error, 'Failed to query database record');
    }
  }

  /**
   * Query multiple documents with pagination.
   *
   * @param {Object} [filter={}] - Match filter.
   * @param {Object} [options={}] - Query settings (page, limit, sort, etc).
   * @returns {Promise<{ docs: Array<import('mongoose').Document>, total: number, limit: number, page: number, pages: number, hasNextPage: boolean, hasPrevPage: boolean }>}
   */
  async findMany(filter = {}, options = {}) {
    try {
      return await this.repository.findMany(filter, options);
    } catch (error) {
      this.handleError(error, 'Failed to query database records list');
    }
  }

  /**
   * Standard error handler that logs standard system errors, handles Mongoose errors, and throws AppError.
   *
   * @param {Error} error - Raw caught exception.
   * @param {string} defaultMessage - Contextual fallback message.
   * @throws {AppError} Standardized application error.
   */
  handleError(error, defaultMessage) {
    if (error instanceof AppError) {
      throw error;
    }

    // Handle Mongoose schemas validation exceptions
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      throw AppError.validation('Database validation failure', errors);
    }

    // Handle Mongoose duplicate key index exception
    if (error.code === 11000) {
      throw AppError.conflict('A record with duplicate identifiers already exists in the system');
    }

    console.error('Service layer error caught:', error);
    throw new AppError(error.statusCode || 500, error.message || defaultMessage);
  }
}

export default BaseService;
