import BaseRepository from './BaseRepository.js';
import MemberNominee from '../models/MemberNominee.js';
import '../models/Member.js';

export class MemberNomineeRepository extends BaseRepository {
  constructor() {
    super(MemberNominee);
  }
}

const memberNomineeRepositoryInstance = new MemberNomineeRepository();
export default memberNomineeRepositoryInstance;
export { memberNomineeRepositoryInstance as MemberNomineeRepositoryInstance };
