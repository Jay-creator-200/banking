import BaseRepository from './BaseRepository.js';
import LoginLog from '../models/LoginLog.js';

export class LoginLogRepository extends BaseRepository {
  constructor() {
    super(LoginLog);
  }
}

const loginLogRepositoryInstance = new LoginLogRepository();
export default loginLogRepositoryInstance;
