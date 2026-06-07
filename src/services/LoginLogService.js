import BaseService from './BaseService.js';
import loginLogRepository from '../repositories/LoginLogRepository.js';

export class LoginLogService extends BaseService {
  constructor() {
    super(loginLogRepository);
  }

  /**
   * Log an authentication attempt.
   * Runs in a safe try-catch wrapper to avoid login blockage on log failure.
   *
   * @param {string} email
   * @param {string} status - Enum: SUCCESS, FAILED, LOGOUT.
   * @param {string} [userId=null]
   * @param {string} [ip='']
   * @param {string} [ua='']
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async logAttempt(email, status, userId = null, ip = '', ua = '') {
    try {
      const payload = {
        email,
        loginStatus: status.toUpperCase(),
        userId: userId || undefined,
        ipAddress: ip,
        userAgent: ua,
      };
      return await this.repository.create(payload);
    } catch (error) {
      console.error('Failed to log login attempt in database:', error);
      return null;
    }
  }
}

const loginLogServiceInstance = new LoginLogService();
export default loginLogServiceInstance;
