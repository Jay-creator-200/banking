import BaseService from './BaseService.js';
import permissionRepository from '../repositories/PermissionRepository.js';

export class PermissionService extends BaseService {
  constructor() {
    super(permissionRepository);
  }
}

const permissionServiceInstance = new PermissionService();
export default permissionServiceInstance;
