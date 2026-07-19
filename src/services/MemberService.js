import BaseService from './BaseService.js';
import memberRepository from '../repositories/MemberRepository.js';
import sequenceService from './SequenceService.js';
import { createMemberSchema, updateMemberSchema } from '../schemas/member.schema.js';
import { AppError } from '../utils/error-handler.js';
import auditLogService from './AuditLogService.js';
import mongoose from 'mongoose';

export class MemberService extends BaseService {
  constructor() {
    super(memberRepository);
  }

  /**
   * Register a new member.
   * Optionally auto-charges membership fee by queuing a transaction.
   *
   * @param {Object} data - Member input fields.
   * @param {string} userId - Operating User ID.
   * @param {Object} [auditContext={}] - IP and User Agent context for audits.
   * @returns {Promise<import('mongoose').Document>} Registered member doc.
   */
  async createMember(data, userId, auditContext = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { autoChargeFee, ...memberData } = data;

      // Validate Zod schema
      const { memberNoType, manualMemberNo, ...validatedFields } = this.validate(createMemberSchema, memberData);

      // Duplicate detection
      const duplicateQuery = {
        $or: [
          { mobile: validatedFields.mobile },
          { aadhaarNumber: validatedFields.aadhaarNumber },
        ],
      };
      if (validatedFields.email) {
        duplicateQuery.$or.push({ email: validatedFields.email });
      }
      if (validatedFields.panNumber) {
        duplicateQuery.$or.push({ panNumber: validatedFields.panNumber });
      }

      const duplicate = await this.repository.findOne(duplicateQuery);
      if (duplicate) {
        throw AppError.conflict('A member with matching mobile, email, PAN, or Aadhaar already exists.');
      }

      // Generate member number
      let memberNo;
      if (memberNoType === 'manual') {
        if (!manualMemberNo) {
          throw AppError.validation('Manual member number is required when manual code generation is selected.');
        }
        const isNumeric = /^\d+$/.test(manualMemberNo);
        if (!isNumeric) {
          throw AppError.validation('Manual member number must contain digits only.');
        }
        const parsedNum = parseInt(manualMemberNo, 10);
        if (parsedNum <= 0) {
          throw AppError.validation('Manual member number must be a positive integer.');
        }
        const paddedSuffix = String(parsedNum).padStart(4, '0');
        memberNo = `NCS-${paddedSuffix}`;

        // Verify uniqueness
        const existingNo = await this.repository.findOne({ memberNo });
        if (existingNo) {
          throw AppError.conflict(`Member number ${memberNo} already exists.`);
        }
      } else {
        // Auto-generate: scan existing members matching regex /^NCS-\d+$/
        const allMatchingMembers = await this.repository.model.find({
          memberNo: /^NCS-\d+$/
        }).session(session);
        
        let maxNum = 0;
        for (const m of allMatchingMembers) {
          const suffix = m.memberNo.split('-')[1];
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
        const nextNum = maxNum + 1;
        memberNo = `NCS-${String(nextNum).padStart(4, '0')}`;
      }

      // Create member profile
      const member = await this.repository.create(
        {
          ...validatedFields,
          memberNo,
          kycStatus: 'pending',
          memberStatus: 'active',
          createdBy: userId,
          updatedBy: userId,
        },
        { session }
      );

      // Create Savings Account Automatically
      const { SavingsAccountServiceInstance } = await import('./SavingsAccountService.js');
      await SavingsAccountServiceInstance.openAccount(
        {
          memberId: member._id.toString(),
          branchId: validatedFields.branchId.toString(),
          accountType: 'regular',
          openingDeposit: 0,
        },
        userId,
        true, // isAutoCreate
        session
      );

      // Handle auto-charged membership fee transaction dispatch
      if (autoChargeFee === true) {
        await this.chargeMembershipFee(member, userId, session);
      }

      // Log action to audit history
      await auditLogService.logAction(
        userId,
        'members',
        'MEMBER_CREATE',
        'members',
        member._id,
        null,
        member.toObject ? member.toObject() : member,
        auditContext.ip || '127.0.0.1',
        auditContext.ua || 'Unknown'
      );

      await session.commitTransaction();
      session.endSession();

      return member;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to create member profile');
    }
  }

  /**
   * Update a member profile.
   *
   * @param {string} id - Member ID.
   * @param {Object} data - Updated fields.
   * @param {string} userId - Operating User ID.
   * @param {Object} [auditContext={}] - IP and User Agent context.
   * @returns {Promise<import('mongoose').Document>} Updated member.
   */
  async updateMember(id, data, userId, auditContext = {}) {
    try {
      const validated = this.validate(updateMemberSchema, data);
      
      const oldDoc = await this.repository.findById(id);
      if (!oldDoc) {
        throw AppError.notFound('Member not found');
      }

      const updated = await this.update(id, validated, null, userId);

      await auditLogService.logAction(
        userId,
        'members',
        'MEMBER_UPDATE',
        'members',
        id,
        oldDoc.toObject ? oldDoc.toObject() : oldDoc,
        updated.toObject ? updated.toObject() : updated,
        auditContext.ip || '127.0.0.1',
        auditContext.ua || 'Unknown'
      );

      return updated;
    } catch (error) {
      this.handleError(error, 'Failed to update member profile');
    }
  }

  /**
   * Charge member registration fee.
   * Sets up a PENDING MEMBERSHIP_FEE transaction under checker review.
   *
   * @param {import('mongoose').Document} member - Member document.
   * @param {string} userId - Operator User ID.
   * @param {import('mongoose').ClientSession} session - DB Session.
   */
  async chargeMembershipFee(member, userId, session) {
    const { TransactionServiceInstance } = await import('./TransactionService.js');
    await TransactionServiceInstance.createTransaction(
      {
        branchId: member.branchId.toString(),
        memberId: member._id.toString(),
        accountType: 'membership',
        accountId: member.memberNo,
        transactionType: 'MEMBERSHIP_FEE',
        paymentMode: 'CASH',
        amount: 10, // Standard membership registration fee
        narration: `Automated registration membership fee for ${member.fullName} (${member.memberNo})`,
      },
      userId,
      session
    );
  }

  /**
   * Complete KYC verification outcome.
   *
   * @param {string} id - Member ID.
   * @param {string} status - Result ('verified', 'rejected').
   * @param {string} remarks - Auditor comments.
   * @param {string} userId - Verifier User ID.
   * @param {Object} [auditContext={}] - Audit IP/UA.
   * @returns {Promise<import('mongoose').Document>} Updated member.
   */
  async verifyKYC(id, status, remarks, userId, auditContext = {}) {
    try {
      const member = await this.repository.findById(id);
      if (!member) {
        throw AppError.notFound('Member not found');
      }

      const cleanStatus = String(status).toLowerCase().trim();
      if (!['verified', 'rejected'].includes(cleanStatus)) {
        throw AppError.validation("KYC Status must be either 'verified' or 'rejected'");
      }

      const oldKycStatus = member.kycStatus;
      member.kycStatus = cleanStatus;
      member.remarks = remarks || '';
      member.updatedBy = userId;

      await member.save();

      // Log KYC action
      await auditLogService.logAction(
        userId,
        'members',
        cleanStatus === 'verified' ? 'KYC_VERIFY' : 'KYC_REJECT',
        'members',
        id,
        { kycStatus: oldKycStatus },
        { kycStatus: cleanStatus, remarks },
        auditContext.ip || '127.0.0.1',
        auditContext.ua || 'Unknown'
      );

      return member;
    } catch (error) {
      this.handleError(error, 'Failed to update member KYC status');
    }
  }

  /**
   * Update member status. Enforces operational lifecycle transitions.
   *
   * @param {string} id - Member ID.
   * @param {string} status - New state ('active', 'inactive', 'closed', 'deceased').
   * @param {string} remarks - Audit reasons.
   * @param {string} userId - Operating User ID.
   * @param {Object} [auditContext={}] - Audit IP/UA.
   * @returns {Promise<import('mongoose').Document>} Updated member.
   */
  async updateStatus(id, status, remarks, userId, auditContext = {}) {
    try {
      const member = await this.repository.findById(id);
      if (!member) {
        throw AppError.notFound('Member not found');
      }

      const cleanStatus = String(status).toLowerCase().trim();
      if (!['active', 'inactive', 'closed', 'deceased'].includes(cleanStatus)) {
        throw AppError.validation('Invalid member status transition');
      }

      const oldStatus = member.memberStatus;
      member.memberStatus = cleanStatus;
      member.remarks = remarks || '';
      member.updatedBy = userId;

      await member.save();

      // Log audit
      let auditAction = 'MEMBER_UPDATE';
      if (cleanStatus === 'closed') auditAction = 'MEMBER_CLOSE';
      if (cleanStatus === 'deceased') auditAction = 'MEMBER_DECEASED';

      await auditLogService.logAction(
        userId,
        'members',
        auditAction,
        'members',
        id,
        { memberStatus: oldStatus },
        { memberStatus: cleanStatus, remarks },
        auditContext.ip || '127.0.0.1',
        auditContext.ua || 'Unknown'
      );

      return member;
    } catch (error) {
      this.handleError(error, 'Failed to update member lifecycle status');
    }
  }
}

const memberServiceInstance = new MemberService();
export default memberServiceInstance;
export { memberServiceInstance as MemberServiceInstance };
