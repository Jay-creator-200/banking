import BaseService from './BaseService.js';
import shareLedgerRepository from '../repositories/ShareLedgerRepository.js';
import shareCertificateRepository from '../repositories/ShareCertificateRepository.js';
import memberRepository from '../repositories/MemberRepository.js';
import sequenceService from './SequenceService.js';
import { purchaseSharesSchema } from '../schemas/member.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class ShareLedgerService extends BaseService {
  constructor() {
    super(shareLedgerRepository);
  }

  /**
   * Request a share purchase (Maker phase).
   * Generates a certificate and ledger entry in PENDING state and queues transaction.
   *
   * @param {Object} data - Share purchase parameters.
   * @param {string} userId - Creator User ID.
   * @returns {Promise<Object>} The pending share certificate and ledger entries.
   */
  async purchaseShares(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const validated = this.validate(purchaseSharesSchema, data);

      const member = await memberRepository.findById(validated.memberId);
      if (!member) {
        throw AppError.notFound('Member not found');
      }

      // Generate certificate number atomically
      const certificateNo = await sequenceService.generateSequence('CERT', member.branchId, session);
      const totalAmount = validated.sharesPurchased * validated.shareValue;

      // 1. Create ShareCertificate in pending state
      const certDoc = await shareCertificateRepository.create(
        {
          certificateNo,
          memberId: member._id,
          issuedDate: new Date(),
          sharesIssued: validated.sharesPurchased,
          shareValue: validated.shareValue,
          totalAmount,
          status: 'pending',
          createdBy: userId,
          updatedBy: userId,
        },
        { session }
      );

      // 2. Create ShareLedger in pending state
      const ledgerDoc = await this.repository.create(
        {
          memberId: member._id,
          certificateNo,
          sharesPurchased: validated.sharesPurchased,
          shareValue: validated.shareValue,
          totalAmount,
          purchaseDate: new Date(),
          status: 'pending',
          createdBy: userId,
          updatedBy: userId,
        },
        { session }
      );

      // 3. Dispatch a PENDING transaction to queue approval
      const { TransactionServiceInstance } = await import('./TransactionService.js');
      const transaction = await TransactionServiceInstance.createTransaction(
        {
          branchId: member.branchId.toString(),
          memberId: member._id.toString(),
          accountType: 'share',
          accountId: member.memberNo,
          transactionType: 'SHARE_PURCHASE',
          paymentMode: validated.paymentMode,
          amount: totalAmount,
          narration: `Share purchase of ${validated.sharesPurchased} shares. Certificate No: ${certificateNo}`,
          sourceCollection: 'ShareCertificate',
          sourceId: certDoc._id.toString(),
        },
        userId
      );

      // Link transaction reference inside the ledger entry (even if pending)
      ledgerDoc.transactionId = transaction._id;
      await ledgerDoc.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { certificate: certDoc, ledger: ledgerDoc, transaction };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to purchase shares');
    }
  }

  /**
   * Cancel an active certificate (Mark status as cancelled).
   * Note: Financial compensating entry must be routed through the transaction/reversal engine.
   *
   * @param {string} certificateId - Target certificate document ID.
   * @param {string} userId - Operating User ID.
   * @returns {Promise<Object>} Cancelled records.
   */
  async cancelCertificate(certificateId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const cert = await shareCertificateRepository.findById(certificateId);
      if (!cert) {
        throw AppError.notFound('Certificate not found');
      }
      if (cert.status !== 'active') {
        throw AppError.validation(`Only active certificates can be cancelled. Current: ${cert.status}`);
      }

      // Mark certificate as cancelled
      cert.status = 'cancelled';
      cert.updatedBy = userId;
      await cert.save({ session });

      // Mark ledger entries matching certificate number as cancelled
      await this.repository.model.updateMany(
        { certificateNo: cert.certificateNo },
        { $set: { status: 'cancelled', updatedBy: userId } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return cert;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to cancel share certificate');
    }
  }
}

const shareLedgerServiceInstance = new ShareLedgerService();
export default shareLedgerServiceInstance;
export { shareLedgerServiceInstance as ShareLedgerServiceInstance };
