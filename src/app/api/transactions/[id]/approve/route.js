import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import approvalService from '@/services/ApprovalService.js';
import approvalRequestRepository from '@/repositories/ApprovalRequestRepository.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.approve')) {
      throw AppError.forbidden('You do not have permission to approve transactions');
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    
    // Find the associated pending approval request
    const approval = await approvalRequestRepository.findOne({
      moduleName: 'TRANSACTION',
      referenceId: id,
      status: 'PENDING',
    });

    if (!approval) {
      throw AppError.notFound('Pending approval request not found for this transaction.');
    }

    const approvedReq = await approvalService.approve(approval._id, session.user.id, {
      remarks: body.remarks || 'Approved directly via transaction page',
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'transactions',
      'APPROVE_TRANSACTION',
      'transactions',
      id,
      null,
      approvedReq.toObject ? approvedReq.toObject() : approvedReq,
      ip,
      ua
    );

    return successResponse({ message: 'Transaction approved and posted successfully' }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
