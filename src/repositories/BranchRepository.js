import BaseRepository from './BaseRepository.js';
import Branch from '../models/Branch.js';

export class BranchRepository extends BaseRepository {
  constructor() {
    super(Branch);
  }
}

const branchRepositoryInstance = new BranchRepository();
export default branchRepositoryInstance;
