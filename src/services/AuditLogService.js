import BaseService from './BaseService.js';
import auditLogRepository from '../repositories/AuditLogRepository.js';

export class AuditLogService extends BaseService {
  constructor() {
    super(auditLogRepository);
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
