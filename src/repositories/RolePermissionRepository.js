import BaseRepository from './BaseRepository.js';
import RolePermission from '../models/RolePermission.js';
// Side-effect import: registers the 'Permission' schema with Mongoose so that
// .populate('permissionId') can resolve the model by name at runtime.
import '../models/Permission.js';

export class RolePermissionRepository extends BaseRepository {
  constructor() {
    super(RolePermission);
  }
  
  /**
   * Bulk update mappings for a role ID.
   * Clears existing mappings and inserts the new set.
   *
   * @param {string} roleId
   * @param {Array<string>} permissionIds
   * @returns {Promise<Array<Object>>}
   */
  async updateMappings(roleId, permissionIds) {
    // Perform mapping updates cleanly in a Mongoose session if needed,
    // or standard clear and insert
    await this.model.deleteMany({ roleId });
    if (permissionIds.length === 0) return [];
    
    const records = permissionIds.map(permId => ({
      roleId,
      permissionId: permId
    }));
    return this.model.insertMany(records);
  }
}

const rolePermissionRepositoryInstance = new RolePermissionRepository();
export default rolePermissionRepositoryInstance;
