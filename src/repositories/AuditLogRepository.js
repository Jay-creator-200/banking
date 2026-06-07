import BaseRepository from './BaseRepository.js';
import AuditLog from '../models/AuditLog.js';

export class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }
}

const auditLogRepositoryInstance = new AuditLogRepository();
export default auditLogRepositoryInstance;
