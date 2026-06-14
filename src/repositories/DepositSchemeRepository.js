import BaseRepository from './BaseRepository.js';
import DepositScheme from '../models/DepositScheme.js';

export class DepositSchemeRepository extends BaseRepository {
  constructor() {
    super(DepositScheme);
  }
}

const depositSchemeRepositoryInstance = new DepositSchemeRepository();
export default depositSchemeRepositoryInstance;
export { depositSchemeRepositoryInstance as DepositSchemeRepositoryInstance };
