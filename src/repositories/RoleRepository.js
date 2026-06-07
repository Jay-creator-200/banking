import BaseRepository from './BaseRepository.js';
import Role from '../models/Role.js';

export class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }
}

const roleRepositoryInstance = new RoleRepository();
export default roleRepositoryInstance;
