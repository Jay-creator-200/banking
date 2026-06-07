/**
 * Base Repository implementation providing abstract data access functionality.
 * Designed to be subclassed by specific entity repositories.
 */
export class BaseRepository {
  /**
   * @param {import('mongoose').Model} model - The Mongoose model associated with this repository.
   */
  constructor(model) {
    if (!model) {
      throw new Error('Mongoose model is required to instantiate BaseRepository');
    }
    this.model = model;
  }

  /**
   * Create a new document in the collection.
   * Supports options like Mongoose session for database transactions.
   *
   * @param {Object} data - Entity data to save.
   * @param {import('mongoose').SaveOptions} [options] - Saving options.
   * @returns {Promise<import('mongoose').Document>}
   */
  async create(data, options = {}) {
    const document = new this.model(data);
    return document.save(options);
  }

  /**
   * Update an existing document by its ID.
   * Applies schema validation hooks on update.
   *
   * @param {string|import('mongoose').Types.ObjectId} id - The ID of the document to update.
   * @param {Object} data - The updated payload.
   * @param {import('mongoose').QueryOptions} [options] - Update configuration options.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async update(id, data, options = {}) {
    return this.model
      .findByIdAndUpdate(id, data, {
        new: true, // Returns the modified document rather than original
        runValidators: true, // Validates updates against schema definition
        ...options,
      })
      .exec();
  }

  /**
   * Performs a soft delete by marking `isDeleted` as true.
   * Reuses baseSchemaPlugin's `softDelete()` method if present, otherwise fallbacks.
   *
   * @param {string|import('mongoose').Types.ObjectId} id - The ID of the document to delete.
   * @param {string} [userId='SYSTEM'] - The user ID who initiated the delete.
   * @param {import('mongoose').SaveOptions} [options] - Mongoose saving options.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async delete(id, userId = 'SYSTEM', options = {}) {
    const document = await this.model.findById(id).exec();
    if (!document) return null;

    if (typeof document.softDelete === 'function') {
      return document.softDelete(userId);
    }

    document.isDeleted = true;
    document.updatedBy = userId;
    return document.save(options);
  }

  /**
   * Retrieve a single document by its ID.
   * Supports field selection and collection populates.
   *
   * @param {string|import('mongoose').Types.ObjectId} id - Document ID.
   * @param {Array<string|Object>} [populate=[]] - Reference collections to populate.
   * @param {string} [select=''] - Space-separated list of fields to return.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id, populate = [], select = '') {
    let query = this.model.findById(id);
    if (select) {
      query = query.select(select);
    }
    if (populate.length) {
      populate.forEach((item) => {
        query = query.populate(item);
      });
    }
    return query.exec();
  }

  /**
   * Retrieve a single document matching the filter query.
   *
   * @param {Object} [filter={}] - Mongoose matching criteria.
   * @param {Array<string|Object>} [populate=[]] - Reference fields to populate.
   * @param {string} [select=''] - Space-separated fields to return.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findOne(filter = {}, populate = [], select = '') {
    let query = this.model.findOne(filter);
    if (select) {
      query = query.select(select);
    }
    if (populate.length) {
      populate.forEach((item) => {
        query = query.populate(item);
      });
    }
    return query.exec();
  }

  /**
   * Retrieve multiple documents with support for pagination, sorting, and populated fields.
   *
   * @param {Object} [filter={}] - Match criteria.
   * @param {Object} [options={}] - Query modifiers.
   * @param {number} [options.page=1] - 1-indexed page number.
   * @param {number} [options.limit=10] - Number of items per page.
   * @param {string|Object} [options.sort='-createdAt'] - Sorting priority.
   * @param {Array<string|Object>} [options.populate=[]] - Fields to populate.
   * @param {string} [options.select=''] - Fields to return.
   * @returns {Promise<{ docs: Array<import('mongoose').Document>, total: number, limit: number, page: number, pages: number, hasNextPage: boolean, hasPrevPage: boolean }>}
   */
  async findMany(filter = {}, options = {}) {
    const page = Math.max(1, parseInt(options.page || 1, 10));
    const limit = Math.max(1, parseInt(options.limit || 10, 10));
    const skip = (page - 1) * limit;
    const sort = options.sort || '-createdAt';
    const populate = options.populate || [];
    const select = options.select || '';

    let query = this.model.find(filter);

    if (sort) {
      query = query.sort(sort);
    }
    if (select) {
      query = query.select(select);
    }
    if (populate.length) {
      populate.forEach((item) => {
        query = query.populate(item);
      });
    }

    query = query.skip(skip).limit(limit);

    // Run query and total count in parallel to maximize performance
    const [docs, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      docs,
      total,
      limit,
      page,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    };
  }
}

export default BaseRepository;
