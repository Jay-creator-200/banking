import BaseService from './BaseService.js';
import sequenceRepository from '../repositories/SequenceRepository.js';

export class SequenceService extends BaseService {
  constructor() {
    super(sequenceRepository);
  }

  /**
   * Generate next transaction sequence number.
   * Format: TXN-{YEAR}-{6-digit-zero-padded} (e.g. TXN-2026-000001)
   *
   * @param {string|import('mongoose').Types.ObjectId} branchId - Branch ID
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<string>} Sequence string
   */
  async generateTransactionNo(branchId, session = null) {
    const year = new Date().getFullYear();
    const nextVal = await this.repository.getNextValue('TXN', branchId, year, session);
    const paddedVal = String(nextVal).padStart(6, '0');
    return `TXN-${year}-${paddedVal}`;
  }

  /**
   * Generate next journal voucher sequence number.
   * Format: JV-{YEAR}-{6-digit-zero-padded} (e.g. JV-2026-000001)
   *
   * @param {string|import('mongoose').Types.ObjectId} branchId - Branch ID
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<string>} Sequence string
   */
  async generateVoucherNo(branchId, session = null) {
    const year = new Date().getFullYear();
    const nextVal = await this.repository.getNextValue('JV', branchId, year, session);
    const paddedVal = String(nextVal).padStart(6, '0');
    return `JV-${year}-${paddedVal}`;
  }

  /**
   * Generic sequence generator.
   *
   * @param {string} prefix - Sequence prefix
   * @param {string|import('mongoose').Types.ObjectId} branchId - Branch ID
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<string>} Sequence string in format {PREFIX}-{YEAR}-{6-digit}
   */
  async generateSequence(prefix, branchId, session = null) {
    const year = new Date().getFullYear();
    const nextVal = await this.repository.getNextValue(prefix, branchId, year, session);
    const paddedVal = String(nextVal).padStart(6, '0');
    return `${String(prefix).toUpperCase().trim()}-${year}-${paddedVal}`;
  }
}

const sequenceServiceInstance = new SequenceService();
export default sequenceServiceInstance;
export { sequenceServiceInstance as SequenceServiceInstance };
