import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositReportService from '@/services/DepositReportService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view deposit reports');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const summary = await depositReportService.getSummary(branchId);
    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
