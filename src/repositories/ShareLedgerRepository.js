import BaseRepository from './BaseRepository.js';
import ShareLedger from '../models/ShareLedger.js';
import '../models/Member.js';
import '../models/Transaction.js';

export class ShareLedgerRepository extends BaseRepository {
  constructor() {
    super(ShareLedger);
  }
}

const shareLedgerRepositoryInstance = new ShareLedgerRepository();
export default shareLedgerRepositoryInstance;
export { shareLedgerRepositoryInstance as ShareLedgerRepositoryInstance };
