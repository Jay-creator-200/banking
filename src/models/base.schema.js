import mongoose from 'mongoose';

/**
 * Mongoose Plugin that implements standard auditing and soft delete logic.
 *
 * Adds the following fields:
 * - `createdBy`: ObjectId (references User model or system placeholder)
 * - `updatedBy`: ObjectId (references User model or system placeholder)
 * - `status`: String (defaults to 'ACTIVE')
 * - `isDeleted`: Boolean (defaults to false, indexed)
 *
 * Features:
 * - Enables Mongoose native `timestamps` (createdAt, updatedAt) automatically.
 * - Adds pre-find query middleware to filter out soft-deleted records by default.
 * - Provides an instance method `softDelete(userId)` to flag records as deleted.
 *
 * @param {import('mongoose').Schema} schema
 */
export function baseSchemaPlugin(schema) {
  // Add foundation fields to the schema
  schema.add({
    createdBy: {
      type: String, // String identifier or Mongoose ObjectId referencing User
      default: 'SYSTEM',
    },
    updatedBy: {
      type: String, // String identifier or Mongoose ObjectId referencing User
      default: 'SYSTEM',
    },
    status: {
      type: String,
      required: true,
      default: 'ACTIVE',
      uppercase: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  });

  // Enable automatic timestamps (createdAt, updatedAt)
  schema.set('timestamps', true);

  // Apply query middleware to hide soft-deleted records automatically.
  // Applies to find, findOne, findOneAndUpdate, updateMany, countDocuments, etc.
  const queryMethods = [
    'find',
    'findOne',
    'countDocuments',
    'estimatedDocumentCount',
    'findOneAndUpdate',
    'update',
    'updateMany',
  ];

  queryMethods.forEach((method) => {
    schema.pre(method, function (next) {
      const queryFilter = this.getFilter();
      // If the query explicitly seeks isDeleted, respect that (e.g. { isDeleted: true })
      if (queryFilter.isDeleted === undefined) {
        this.where({ isDeleted: false });
      }
      if (typeof next === 'function') {
        next();
      }
    });
  });

  // Add instance method to perform soft deletion
  schema.methods.softDelete = async function (userId = 'SYSTEM') {
    this.isDeleted = true;
    this.updatedBy = userId;
    return this.save();
  };
}

export default baseSchemaPlugin;
