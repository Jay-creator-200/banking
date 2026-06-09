import BaseService from './BaseService.js';
import loanApplicationRepository from '../repositories/LoanApplicationRepository.js';
import loanProductRepository from '../repositories/LoanProductRepository.js';
import sequenceService from './SequenceService.js';
import approvalService from './ApprovalService.js';
import auditLogService from './AuditLogService.js';
import {
  createLoanApplicationSchema,
  updateLoanApplicationSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
} from '../schemas/loan.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LoanApplicationService extends BaseService {
  constructor() {
    super(loanApplicationRepository);
  }

  /**
   * Create a new loan application (starts in draft).
   */
  async createApplication(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const validated = this.validate(createLoanApplicationSchema, data);

      // Validate product exists and is active
      const product = await loanProductRepository.findById(validated.loanProductId);
      if (!product || !product.isActive) throw AppError.notFound('Loan product not found or inactive');

      // Validate amount and tenure within product limits
      if (validated.requestedAmount < product.minimumAmount || validated.requestedAmount > product.maximumAmount) {
        throw AppError.validation(`Requested amount must be between ₹${product.minimumAmount} and ₹${product.maximumAmount}`);
      }
      if (validated.requestedTenureMonths < product.minimumTenure || validated.requestedTenureMonths > product.maximumTenure) {
        throw AppError.validation(`Tenure must be between ${product.minimumTenure} and ${product.maximumTenure} months`);
      }

      // Calculate processing fee
      let processingFee = 0;
      if (product.processingFeeType === 'fixed') {
        processingFee = product.processingFeeValue;
      } else {
        processingFee = Math.round((validated.requestedAmount * product.processingFeeValue) / 100 * 100) / 100;
      }

      // Generate application number
      const applicationNo = await sequenceService.generateSequence('LA', validated.branchId, session);

      const application = await loanApplicationRepository.create({
        ...validated,
        applicationNo,
        applicationStatus: 'draft',
        processingFee,
        applicationDate: new Date(),
        createdBy: userId,
        updatedBy: userId,
      }, { session });

      await auditLogService.log({
        userId,
        action: 'LOAN_APPLICATION_CREATED',
        module: 'LOAN',
        entityId: application._id.toString(),
        description: `Loan application ${applicationNo} created for member`,
      });

      await session.commitTransaction();
      session.endSession();
      return application;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to create loan application');
    }
  }

  /**
   * Update a draft application.
   */
  async updateApplication(id, data, userId) {
    const validated = this.validate(updateLoanApplicationSchema, data);
    const application = await loanApplicationRepository.findById(id);
    if (!application) throw AppError.notFound('Loan application not found');
    if (application.applicationStatus !== 'draft') {
      throw AppError.validation('Only draft applications can be edited');
    }
    Object.assign(application, validated, { updatedBy: userId });
    return application.save();
  }

  /**
   * Submit a draft application for review.
   */
  async submitApplication(id, userId) {
    const application = await loanApplicationRepository.findById(id);
    if (!application) throw AppError.notFound('Loan application not found');
    if (application.applicationStatus !== 'draft') {
      throw AppError.validation('Only draft applications can be submitted');
    }

    application.applicationStatus = 'submitted';
    application.updatedBy = userId;
    await application.save();

    await auditLogService.log({
      userId,
      action: 'LOAN_APPLICATION_SUBMITTED',
      module: 'LOAN',
      entityId: id,
      description: `Application ${application.applicationNo} submitted for review`,
    });

    return application;
  }

  /**
   * Mark application as under_review.
   */
  async markUnderReview(id, userId) {
    const application = await loanApplicationRepository.findById(id);
    if (!application) throw AppError.notFound('Loan application not found');
    if (application.applicationStatus !== 'submitted') {
      throw AppError.validation('Application must be submitted before review');
    }
    application.applicationStatus = 'under_review';
    application.updatedBy = userId;
    return application.save();
  }

  /**
   * Approve a loan application. Creates an approval request via ApprovalService.
   */
  async approveApplication(data, userId) {
    const validated = this.validate(approveApplicationSchema, data);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const application = await loanApplicationRepository.findById(validated.applicationId);
      if (!application) throw AppError.notFound('Loan application not found');
      if (!['submitted', 'under_review'].includes(application.applicationStatus)) {
        throw AppError.validation('Application must be submitted or under review to approve');
      }

      application.applicationStatus = 'approved';
      application.approvedAmount = validated.approvedAmount;
      application.approvedTenure = validated.approvedTenure;
      application.approvedBy = userId;
      application.approvedAt = new Date();
      application.remarks = validated.remarks || application.remarks;
      application.updatedBy = userId;
      await application.save({ session });

      await auditLogService.log({
        userId,
        action: 'LOAN_APPLICATION_APPROVED',
        module: 'LOAN',
        entityId: application._id.toString(),
        description: `Application ${application.applicationNo} approved. Amount: ₹${validated.approvedAmount}`,
      });

      await session.commitTransaction();
      session.endSession();
      return application;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to approve application');
    }
  }

  /**
   * Reject a loan application.
   */
  async rejectApplication(data, userId) {
    const validated = this.validate(rejectApplicationSchema, data);
    const application = await loanApplicationRepository.findById(validated.applicationId);
    if (!application) throw AppError.notFound('Loan application not found');
    if (!['submitted', 'under_review'].includes(application.applicationStatus)) {
      throw AppError.validation('Application must be submitted or under review to reject');
    }

    application.applicationStatus = 'rejected';
    application.rejectionReason = validated.rejectionReason;
    application.updatedBy = userId;
    await application.save();

    await auditLogService.log({
      userId,
      action: 'LOAN_APPLICATION_REJECTED',
      module: 'LOAN',
      entityId: application._id.toString(),
      description: `Application ${application.applicationNo} rejected. Reason: ${validated.rejectionReason}`,
    });

    return application;
  }

  /**
   * List applications with pagination and filters.
   */
  async listApplications(filters = {}, options = {}) {
    const query = { isDeleted: false };
    if (filters.memberId) query.memberId = filters.memberId;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.loanProductId) query.loanProductId = filters.loanProductId;
    if (filters.applicationStatus) query.applicationStatus = filters.applicationStatus;
    if (filters.startDate && filters.endDate) {
      query.applicationDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
      };
    }

    return loanApplicationRepository.findMany(query, {
      ...options,
      populate: [
        { path: 'memberId', select: 'fullName memberNo mobile' },
        { path: 'branchId', select: 'branchName branchCode' },
        { path: 'loanProductId', select: 'productName productCode interestType interestRate' },
      ],
      sort: '-applicationDate',
    });
  }

  /**
   * Get full application detail with all relations.
   */
  async getApplicationDetail(id) {
    const application = await loanApplicationRepository.findById(
      id,
      [
        { path: 'memberId', select: 'fullName memberNo mobile email address' },
        { path: 'branchId', select: 'branchName branchCode' },
        { path: 'loanProductId' },
        { path: 'approvedBy', select: 'name email' },
      ]
    );
    if (!application) throw AppError.notFound('Loan application not found');
    return application;
  }
}

const loanApplicationService = new LoanApplicationService();
export default loanApplicationService;
export { loanApplicationService as LoanApplicationServiceInstance };
