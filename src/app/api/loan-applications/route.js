import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanApplicationService from '@/services/LoanApplicationService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const { searchParams } = new URL(req.url);
    const result = await loanApplicationService.listApplications({
      memberId: searchParams.get('memberId'),
      branchId: searchParams.get('branchId'),
      loanProductId: searchParams.get('loanProductId'),
      applicationStatus: searchParams.get('applicationStatus'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }, { page: searchParams.get('page') || 1, limit: searchParams.get('limit') || 20 });

    return successResponse(result.docs, 200, { meta: { total: result.total, page: result.page, pages: result.pages } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.apply')) throw AppError.forbidden('Insufficient permissions');

    const body = await req.json();
    const application = await loanApplicationService.createApplication(body, session.user.id);
    return successResponse(application, 201, { message: 'Loan application created successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
