import { BaseRepository } from './BaseRepository.js';
import CashDenomination from '../models/CashDenomination.js';

export class CashDenominationRepository extends BaseRepository {
  constructor() {
    super(CashDenomination);
  }

  /**
   * Find all denomination records for a session.
   *
   * @param {string} sessionId - Session ID
   * @param {'opening'|'closing'} type - Denomination type
   * @returns {Promise<Array>}
   */
  async findBySession(sessionId, type = null) {
    const filter = { sessionId };
    if (type) filter.type = type;
    return this.model.find(filter).sort('denomination').exec();
  }
}

const cashDenominationRepository = new CashDenominationRepository();
export default cashDenominationRepository;
