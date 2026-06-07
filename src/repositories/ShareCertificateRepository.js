import BaseRepository from './BaseRepository.js';
import ShareCertificate from '../models/ShareCertificate.js';
import '../models/Member.js';

export class ShareCertificateRepository extends BaseRepository {
  constructor() {
    super(ShareCertificate);
  }
}

const shareCertificateRepositoryInstance = new ShareCertificateRepository();
export default shareCertificateRepositoryInstance;
export { shareCertificateRepositoryInstance as ShareCertificateRepositoryInstance };
