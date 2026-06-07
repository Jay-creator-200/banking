import BaseRepository from './BaseRepository.js';
import User from '../models/User.js';
// Side-effect imports: register Role and Branch schemas so .populate() can resolve
// them by model name at runtime without MissingSchemaError.
import '../models/Role.js';
import '../models/Branch.js';


export class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find user by username or email for auth procedures, including their role details.
   *
   * @param {string} identifier - Email or username string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findForAuth(identifier) {
    const queryStr = String(identifier || '').toLowerCase().trim();
    return this.model
      .findOne({
        $or: [{ email: queryStr }, { username: queryStr }],
      })
      .populate('roleId')
      .exec();
  }
}

const userRepositoryInstance = new UserRepository();
export default userRepositoryInstance;
