import BaseRepository from './BaseRepository.js';
import Permission from '../models/Permission.js';

export class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }
}

const permissionRepositoryInstance = new PermissionRepository();
export default permissionRepositoryInstance;
