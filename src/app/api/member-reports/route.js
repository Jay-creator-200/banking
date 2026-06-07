import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberRepository from '@/repositories/MemberRepository.js';
import shareCertificateRepository from '@/repositories/ShareCertificateRepository.js';
import transactionRepository from '@/repositories/TransactionRepository.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view member reports');
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType');
    const branchId = searchParams.get('branchId');

    if (!reportType) {
      throw AppError.validation('reportType query parameter is required');
    }

    let data = {};

    switch (reportType) {
      case 'member-register': {
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const filter = {};
        if (branchId) filter.branchId = branchId;
        if (status) filter.memberStatus = status;
        if (category) filter.memberCategory = category;

        const members = await memberRepository.model
          .find(filter)
          .populate('branchId')
          .sort('memberNo')
          .exec();
        data = { members };
        break;
      }

      case 'kyc-pending': {
        const filter = { kycStatus: 'pending' };
        if (branchId) filter.branchId = branchId;

        const members = await memberRepository.model
          .find(filter)
          .populate('branchId')
          .sort('memberNo')
          .exec();
        data = { members };
        break;
      }

      case 'status-based': {
        const status = searchParams.get('status') || 'inactive';
        const filter = { memberStatus: status };
        if (branchId) filter.branchId = branchId;

        const members = await memberRepository.model
          .find(filter)
          .populate('branchId')
          .sort('memberNo')
          .exec();
        data = { members };
        break;
      }

      case 'share-capital': {
        const filter = {};
        if (branchId) {
          const memberIdsInBranch = await memberRepository.model.find({ branchId }).distinct('_id');
          filter.memberId = { $in: memberIdsInBranch };
        }

        const certificates = await shareCertificateRepository.model
          .find(filter)
          .populate('memberId')
          .sort('certificateNo')
          .exec();

        // Calculate summary metrics
        const activeCertificates = certificates.filter(c => c.status === 'active');
        const totalShares = activeCertificates.reduce((sum, c) => sum + (c.sharesIssued || 0), 0);
        const totalAmount = activeCertificates.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

        data = {
          certificates,
          summary: {
            totalCertificates: activeCertificates.length,
            totalShares,
            totalAmount,
          }
        };
        break;
      }

      case 'membership-fees': {
        const filter = { transactionType: 'MEMBERSHIP_FEE' };
        if (branchId) filter.branchId = branchId;
        const status = searchParams.get('status');
        if (status) filter.status = status;

        const transactions = await transactionRepository.model
          .find(filter)
          .populate('memberId')
          .sort('-createdAt')
          .exec();
        data = { transactions };
        break;
      }

      default:
        throw AppError.validation(`Invalid report type: ${reportType}`);
    }

    return successResponse(data, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
