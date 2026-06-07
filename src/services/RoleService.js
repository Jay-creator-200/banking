import BaseService from './BaseService.js';
import roleRepository from '../repositories/RoleRepository.js';
import rolePermissionRepository from '../repositories/RolePermissionRepository.js';

export class RoleService extends BaseService {
  constructor() {
    super(roleRepository);
  }

  /**
   * Get all permission mappings associated with a specific role ID.
   *
   * @param {string} roleId
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async getPermissionsForRole(roleId) {
    return rolePermissionRepository.findMany({ roleId }, { limit: 100, populate: ['permissionId'] });
  }

  /**
   * Replace mappings of permission IDs for a role ID.
   *
   * @param {string} roleId
   * @param {Array<string>} permissionIds
   * @returns {Promise<Array<Object>>}
   */
  async assignPermissionsToRole(roleId, permissionIds) {
    try {
      return await rolePermissionRepository.updateMappings(roleId, permissionIds);
    } catch (error) {
      this.handleError(error, 'Failed to assign permissions to role');
    }
  }
}

const roleServiceInstance = new RoleService();
export default roleServiceInstance;
