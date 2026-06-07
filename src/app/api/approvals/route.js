import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import approvalService from '@/services/ApprovalService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    // Must be cashier/manager/admin (i.e. logged in and has basic transaction rights)
    if (
      !hasPermission(session, 'transaction.view') &&
      !hasPermission(session, 'transaction.approve') &&
      !hasPermission(session, 'transaction.reverse')
    ) {
      throw AppError.forbidden('You do not have permission to view approvals');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const moduleName = searchParams.get('moduleName');
    const requestType = searchParams.get('requestType');

    const filter = {};
    if (moduleName) filter.moduleName = moduleName.toUpperCase();
    if (requestType) filter.requestType = requestType.toUpperCase();

    // Prevent displaying requests made by the current user themselves if they want to act as checker
    // (Optional, we can show it but disable approval buttons on UI. Showing it is better so they track their requests!)
    
    const result = await approvalService.getPendingApprovals(filter, {
      page,
      limit,
      sort: '-requestedAt',
    });

    return successResponse(result.docs, 200, {
      total: result.total,
      limit: result.limit,
      page: result.page,
      pages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
