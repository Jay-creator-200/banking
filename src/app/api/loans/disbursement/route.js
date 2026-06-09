import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanAccountService from '@/services/LoanAccountService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.disburse')) throw AppError.forbidden('Insufficient permissions');

    const body = await req.json();
    const loan = await loanAccountService.disburseLoan(body, session.user.id);
    return successResponse(loan, 201, { message: 'Loan disbursed successfully. EMI schedule generated.' });
  } catch (error) {
    return errorResponse(error);
  }
}
