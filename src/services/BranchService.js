import BaseService from './BaseService.js';
import branchRepository from '../repositories/BranchRepository.js';

export class BranchService extends BaseService {
  constructor() {
    super(branchRepository);
  }
}

const branchServiceInstance = new BranchService();
export default branchServiceInstance;
