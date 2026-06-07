import BaseService from './BaseService.js';
import rolePermissionRepository from '../repositories/RolePermissionRepository.js';

export class RolePermissionService extends BaseService {
  constructor() {
    super(rolePermissionRepository);
  }
}

const rolePermissionServiceInstance = new RolePermissionService();
export default rolePermissionServiceInstance;
