import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanPaymentService from '@/services/LoanPaymentService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const { searchParams } = new URL(req.url);
    const result = await loanPaymentService.listPayments({
      loanId: searchParams.get('loanId'),
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
    if (!hasPermission(session, 'loan.collect')) throw AppError.forbidden('Insufficient permissions');

    const body = await req.json();
    const result = await loanPaymentService.recordPayment(body, session.user.id);
    return successResponse(result, 201, { message: 'Payment recorded and allocated successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
