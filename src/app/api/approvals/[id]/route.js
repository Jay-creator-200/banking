import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import approvalService from '@/services/ApprovalService.js';
import approvalRequestRepository from '@/repositories/ApprovalRequestRepository.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (
      !hasPermission(session, 'transaction.view') &&
      !hasPermission(session, 'transaction.approve') &&
      !hasPermission(session, 'transaction.reverse')
    ) {
      throw AppError.forbidden('You do not have permission to view approvals');
    }

    const { id } = await params;
    const approval = await approvalRequestRepository.findDetailById(id);
    if (!approval) {
      throw AppError.notFound('Approval request not found');
    }

    // Attempt to load full context details dynamically
    const rawObj = approval.toObject ? approval.toObject() : approval;
    let contextDoc = null;
    
    try {
      const mongoose = (await import('mongoose')).default;
      const refModel = mongoose.model(approval.referenceCollection);
      if (refModel) {
        contextDoc = await refModel.findById(approval.referenceId)
          .populate('branchId')
          .populate('memberId')
          .populate('createdBy', 'fullName email username')
          .exec();
      }
    } catch (e) {
      // Reference collection model might not be registered yet, bypass gracefully
    }

    rawObj.contextData = contextDoc;

    return successResponse(rawObj, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    const { id } = await params;
    const body = await req.json();
    const { action, remarks } = body;

    let result;
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    if (action === 'APPROVE') {
      result = await approvalService.approve(id, session.user.id, { remarks });
      await auditLogService.logAction(
        session.user.id,
        'approvals',
        'APPROVE_REQUEST',
        'approvalrequests',
        id,
        null,
        result.toObject ? result.toObject() : result,
        ip,
        ua
      );
    } else if (action === 'REJECT') {
      result = await approvalService.reject(id, session.user.id, { remarks });
      await auditLogService.logAction(
        session.user.id,
        'approvals',
        'REJECT_REQUEST',
        'approvalrequests',
        id,
        null,
        result.toObject ? result.toObject() : result,
        ip,
        ua
      );
    } else {
      throw AppError.validation("Invalid approval action. Must be 'APPROVE' or 'REJECT'");
    }

    return successResponse({ message: `Request successfully ${action.toLowerCase()}d`, result }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
