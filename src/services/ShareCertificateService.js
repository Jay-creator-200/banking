import BaseService from './BaseService.js';
import shareCertificateRepository from '../repositories/ShareCertificateRepository.js';

export class ShareCertificateService extends BaseService {
  constructor() {
    super(shareCertificateRepository);
  }

  /**
   * Fetch active share certificates for a member.
   *
   * @param {string} memberId - Member ID.
   * @returns {Promise<Array<import('mongoose').Document>>} Certificates list.
   */
  async getCertificatesByMember(memberId) {
    try {
      return await this.repository.model.find({ memberId }).exec();
    } catch (error) {
      this.handleError(error, 'Failed to fetch member share certificates');
    }
  }
}

const shareCertificateServiceInstance = new ShareCertificateService();
export default shareCertificateServiceInstance;
export { shareCertificateServiceInstance as ShareCertificateServiceInstance };
