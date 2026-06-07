import BaseService from './BaseService.js';
import memberDocumentRepository from '../repositories/MemberDocumentRepository.js';
import memberRepository from '../repositories/MemberRepository.js';
import { uploadDocumentSchema } from '../schemas/member.schema.js';
import { AppError } from '../utils/error-handler.js';
import auditLogService from './AuditLogService.js';

export class MemberDocumentService extends BaseService {
  constructor() {
    super(memberDocumentRepository);
  }

  /**
   * Register a new member document link.
   *
   * @param {Object} data - Document metadata payload.
   * @param {string} userId - Operator User ID.
   * @returns {Promise<import('mongoose').Document>} Registered document.
   */
  async uploadDoc(data, userId) {
    try {
      const validated = this.validate(uploadDocumentSchema, data);
      
      const member = await memberRepository.findById(validated.memberId);
      if (!member) {
        throw AppError.notFound('Member not found');
      }

      const doc = await this.create({
        ...validated,
        verificationStatus: 'pending',
      }, null, userId);

      return doc;
    } catch (error) {
      this.handleError(error, 'Failed to upload document reference');
    }
  }

  /**
   * Verify or Reject a document.
   *
   * @param {string} docId - Document ID.
   * @param {string} status - Target status ('verified', 'rejected').
   * @param {string} remarks - Auditor comments.
   * @param {string} userId - Verifier User ID.
   * @returns {Promise<import('mongoose').Document>} Verified document.
   */
  async verifyDoc(docId, status, remarks, userId) {
    try {
      const doc = await this.repository.findById(docId);
      if (!doc) {
        throw AppError.notFound('Document reference not found');
      }

      const cleanStatus = String(status).toLowerCase().trim();
      if (!['verified', 'rejected'].includes(cleanStatus)) {
        throw AppError.validation('Verification status must be either verified or rejected');
      }

      doc.verificationStatus = cleanStatus;
      doc.verifiedBy = userId;
      doc.verifiedAt = new Date();
      doc.remarks = remarks || '';
      doc.updatedBy = userId;

      await doc.save();
      return doc;
    } catch (error) {
      this.handleError(error, 'Failed to process document verification');
    }
  }

  /**
   * Get documents linked to a member.
   *
   * @param {string} memberId - Member ID.
   * @returns {Promise<Array<import('mongoose').Document>>} Documents list.
   */
  async getDocuments(memberId) {
    try {
      return await this.repository.model.find({ memberId }).populate('verifiedBy', 'fullName').exec();
    } catch (error) {
      this.handleError(error, 'Failed to fetch member documents');
    }
  }
}

const memberDocumentServiceInstance = new MemberDocumentService();
export default memberDocumentServiceInstance;
export { memberDocumentServiceInstance as MemberDocumentServiceInstance };
