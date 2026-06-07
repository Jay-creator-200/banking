import BaseRepository from './BaseRepository.js';
import Sequence from '../models/Sequence.js';

export class SequenceRepository extends BaseRepository {
  constructor() {
    super(Sequence);
  }

  /**
   * Atomically get and increment the next value of a sequence.
   *
   * @param {string} prefix - The sequence prefix (e.g., 'TXN', 'JV').
   * @param {string|import('mongoose').Types.ObjectId} branchId - The branch ID.
   * @param {number} year - The current calendar/fiscal year.
   * @param {import('mongoose').ClientSession} [session] - Optional session for transaction safety.
   * @returns {Promise<number>} The new sequence number.
   */
  async getNextValue(prefix, branchId, year, session = null) {
    const query = {
      prefix: String(prefix).toUpperCase().trim(),
      branchId,
      year: parseInt(year, 10),
    };
    const update = { $inc: { currentValue: 1 } };
    const options = {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    };
    if (session) {
      options.session = session;
    }
    
    const doc = await this.model.findOneAndUpdate(query, update, options).exec();
    return doc.currentValue;
  }
}

const sequenceRepositoryInstance = new SequenceRepository();
export default sequenceRepositoryInstance;
export { sequenceRepositoryInstance as SequenceRepositoryInstance };
