import BaseRepository from './BaseRepository.js';
import RDInstallment from '../models/RDInstallment.js';

export class RDInstallmentRepository extends BaseRepository {
  constructor() {
    super(RDInstallment);
  }
}

const rdInstallmentRepositoryInstance = new RDInstallmentRepository();
export default rdInstallmentRepositoryInstance;
export { rdInstallmentRepositoryInstance as RDInstallmentRepositoryInstance };
