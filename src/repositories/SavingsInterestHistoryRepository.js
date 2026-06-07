import BaseRepository from './BaseRepository.js';
import SavingsInterestHistory from '../models/SavingsInterestHistory.js';
import '../models/SavingsAccount.js';
import '../models/User.js';

export class SavingsInterestHistoryRepository extends BaseRepository {
  constructor() {
    super(SavingsInterestHistory);
  }
}

const savingsInterestHistoryRepositoryInstance = new SavingsInterestHistoryRepository();
export default savingsInterestHistoryRepositoryInstance;
export { savingsInterestHistoryRepositoryInstance as SavingsInterestHistoryRepositoryInstance };
