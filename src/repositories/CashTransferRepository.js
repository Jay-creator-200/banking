import { BaseRepository } from './BaseRepository.js';
import CashTransfer from '../models/CashTransfer.js';

export class CashTransferRepository extends BaseRepository {
  constructor() {
    super(CashTransfer);
  }

  /**
   * Find pending transfers for a session.
   *
   * @param {string} sessionId - Session ID (as from or to)
   * @returns {Promise<Array>}
   */
  async findPendingForSession(sessionId) {
    return this.model
      .find({
        $or: [{ fromSessionId: sessionId }, { toSessionId: sessionId }],
        status: 'pending',
      })
      .populate('fromSessionId')
      .populate('toSessionId')
      .exec();
  }
}

const cashTransferRepository = new CashTransferRepository();
export default cashTransferRepository;
