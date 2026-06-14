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
      throw AppError.forbidden('You do not have permission to view active deposit lists');
    }

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get('accountType');
    const branchId = searchParams.get('branchId');

    let list;
    if (!accountType) {
      list = await depositReportService.getAllActiveAccounts(branchId);
    } else {
      list = await depositReportService.getActiveAccounts(accountType, branchId);
    }

    return successResponse(list);
  } catch (error) {
    return errorResponse(error);
  }
}

