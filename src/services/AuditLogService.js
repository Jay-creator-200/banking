import BaseService from './BaseService.js';
import auditLogRepository from '../repositories/AuditLogRepository.js';
import mongoose from 'mongoose';

export class AuditLogService extends BaseService {
  constructor() {
    super(auditLogRepository);
  }

  /**
   * Compatibility logger for loan modules.
   * Maps properties to standard logAction fields.
   */
  async log(options = {}) {
    const { userId, action, module, entityId, description, oldValues, newValues } = options;
    
    let refId = null;
    if (entityId) {
      try {
        refId = new mongoose.Types.ObjectId(entityId);
      } catch (err) {
        // If entityId is not a valid ObjectId (e.g. system tag or string), ignore conversion
      }
    }

    return this.logAction(
      userId,
      module || 'LOAN',
      action,
      null, // referenceCollection
      refId,
      oldValues || null,
      newValues || (description ? { description } : null)
    );
  }

  /**
   * Log an audit trail entry.
   * Runs in a safe try-catch wrapper to prevent logging failures from blocking mutations.
   *
   * @param {string} userId - ID of the operator.
   * @param {string} moduleName - Target feature scope.
   * @param {string} actionName - Mutation category (e.g. CREATE_USER).
   * @param {string} [referenceCollection] - Target MongoDB collection.
   * @param {string} [referenceId] - Unique ID of modified record.
   * @param {Object} [oldValues=null] - Payload state before change.
   * @param {Object} [newValues=null] - Payload state after change.
   * @param {string} [ip='']
   * @param {string} [ua='']
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async logAction(
    userId,
    moduleName,
    actionName,
    referenceCollection = null,
    referenceId = null,
    oldValues = null,
    newValues = null,
    ip = '',
    ua = ''
  ) {
    try {
      const payload = {
        userId: userId || 'SYSTEM',
        moduleName,
        actionName,
        referenceCollection,
        referenceId,
        oldValues,
        newValues,
        ipAddress: ip,
        userAgent: ua,
      };
      return await this.repository.create(payload);
    } catch (error) {
      console.error('Audit log logging failed to register:', error);
      return null;
    }
  }
}

const auditLogServiceInstance = new AuditLogService();
export default auditLogServiceInstance;
