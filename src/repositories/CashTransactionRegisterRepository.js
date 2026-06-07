import { BaseRepository } from './BaseRepository.js';
import CashTransactionRegister from '../models/CashTransactionRegister.js';
import mongoose from 'mongoose';

export class CashTransactionRegisterRepository extends BaseRepository {
  constructor() {
    super(CashTransactionRegister);
  }

  /**
   * Find all register entries for a session.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>}
   */
  async findBySession(sessionId) {
    return this.model
      .find({ sessionId })
      .populate('transactionId')
      .sort('-createdAt')
      .exec();
  }

  /**
   * Sum total cash IN and OUT for a session.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<{ totalIn: number, totalOut: number }>}
   */
  async getSessionSummary(sessionId) {
    const objectId = new mongoose.Types.ObjectId(sessionId);
    const deposits = await this.model.aggregate([
      { $match: { sessionId: objectId, transactionType: { $in: ['deposit', 'receipt'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const withdrawals = await this.model.aggregate([
      { $match: { sessionId: objectId, transactionType: { $in: ['withdrawal', 'payment'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return {
      totalIn: deposits[0]?.total || 0,
      totalOut: withdrawals[0]?.total || 0,
    };
  }
}

const cashTransactionRegisterRepository = new CashTransactionRegisterRepository();
export default cashTransactionRegisterRepository;
