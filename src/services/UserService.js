import BaseService from './BaseService.js';
import userRepository from '../repositories/UserRepository.js';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/error-handler.js';

export class UserService extends BaseService {
  constructor() {
    super(userRepository);
  }

  /**
   * Overrides base create to hash user passwords automatically before persistence.
   */
  async create(data, schema = null, userId = 'SYSTEM', options = {}) {
    try {
      const validatedData = schema ? this.validate(schema, data) : data;
      
      // Hash the password with bcryptjs
      if (validatedData.password) {
        const salt = await bcrypt.genSalt(10);
        validatedData.password = await bcrypt.hash(validatedData.password, salt);
      }

      return await super.create(validatedData, null, userId, options);
    } catch (error) {
      this.handleError(error, 'Failed to create user record');
    }
  }

  /**
   * Find user details by email or username for authentications.
   *
   * @param {string} identifier - Username or email string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findForAuth(identifier) {
    return userRepository.findForAuth(identifier);
  }

  /**
   * Record a login failure, locking the user after 5 unsuccessful attempts.
   *
   * @param {string} userId - User document ID.
   * @returns {Promise<import('mongoose').Document>}
   */
  async incrementLoginFailure(userId) {
    try {
      const user = await this.repository.findById(userId);
      if (!user) throw AppError.notFound('User record not found');

      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.isLocked = true;
      }

      return await user.save();
    } catch (error) {
      this.handleError(error, 'Failed to update login failures count');
    }
  }

  /**
   * Reset login failures counter to 0.
   *
   * @param {string} userId
   * @returns {Promise<import('mongoose').Document>}
   */
  async resetLoginFailure(userId) {
    try {
      const user = await this.repository.findById(userId);
      if (!user) throw AppError.notFound('User record not found');

      user.failedLoginAttempts = 0;
      return await user.save();
    } catch (error) {
      this.handleError(error, 'Failed to reset login failures');
    }
  }

  /**
   * Update login audit traits (timestamps and IP addresses).
   *
   * @param {string} userId
   * @param {string} ip
   * @returns {Promise<import('mongoose').Document>}
   */
  async updateLoginInfo(userId, ip) {
    try {
      const user = await this.repository.findById(userId);
      if (!user) throw AppError.notFound('User record not found');

      user.lastLoginAt = new Date();
      user.lastLoginIp = ip;
      user.failedLoginAttempts = 0;
      return await user.save();
    } catch (error) {
      this.handleError(error, 'Failed to record login details');
    }
  }

  /**
   * Unlock a locked account manually by admin overrides.
   *
   * @param {string} userId
   * @param {string} operatorId - Admin user ID.
   * @returns {Promise<import('mongoose').Document>}
   */
  async unlockUser(userId, operatorId = 'SYSTEM') {
    try {
      const user = await this.repository.findById(userId);
      if (!user) throw AppError.notFound('User record not found');

      user.isLocked = false;
      user.failedLoginAttempts = 0;
      user.updatedBy = operatorId;
      return await user.save();
    } catch (error) {
      this.handleError(error, 'Failed to unlock user account');
    }
  }

  /**
   * Force update password hashes securely.
   *
   * @param {string} userId
   * @param {string} newPassword - Raw text password.
   * @param {string} operatorId
   * @returns {Promise<import('mongoose').Document>}
   */
  async changePassword(userId, newPassword, operatorId = 'SYSTEM') {
    try {
      const user = await this.repository.findById(userId);
      if (!user) throw AppError.notFound('User record not found');

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.passwordChangedAt = new Date();
      user.updatedBy = operatorId;

      return await user.save();
    } catch (error) {
      this.handleError(error, 'Failed to change user password');
    }
  }
}

const userServiceInstance = new UserService();
export default userServiceInstance;
