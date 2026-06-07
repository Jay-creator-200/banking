import { BaseRepository } from './BaseRepository.js';
import CashSession from '../models/CashSession.js';

export class CashSessionRepository extends BaseRepository {
  constructor() {
    super(CashSession);
  }

  /**
   * Find active (open) session for a specific teller on a given date.
   *
   * @param {string} userId - Teller user ID
   * @param {string} branchId - Branch ID
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findActiveSession(userId, branchId) {
    return this.model
      .findOne({ userId, branchId, status: 'open' })
      .populate('userId', 'name email')
      .populate('branchId', 'branchName branchCode')
      .exec();
  }

  /**
   * Find sessions for a given branch and date.
   *
   * @param {string} branchId - Branch ID
   * @param {Date} date - Session date (day boundary)
   * @returns {Promise<Array>}
   */
  async findByBranchAndDate(branchId, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.model
      .find({ branchId, sessionDate: { $gte: dayStart, $lte: dayEnd } })
      .populate('userId', 'name email')
      .sort('-openedAt')
      .exec();
  }
}

const cashSessionRepository = new CashSessionRepository();
export default cashSessionRepository;
