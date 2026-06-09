import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanAccountService from '@/services/LoanAccountService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const { searchParams } = new URL(req.url);
    const result = await loanAccountService.listLoans({
      memberId: searchParams.get('memberId'),
      branchId: searchParams.get('branchId'),
      loanProductId: searchParams.get('loanProductId'),
      loanStatus: searchParams.get('loanStatus'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }, { page: searchParams.get('page') || 1, limit: searchParams.get('limit') || 20 });

    return successResponse(result.docs, 200, { meta: { total: result.total, page: result.page, pages: result.pages } });
  } catch (error) {
    return errorResponse(error);
  }
}
