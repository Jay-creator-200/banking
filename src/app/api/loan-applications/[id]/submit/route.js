import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanApplicationService from '@/services/LoanApplicationService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.apply')) throw AppError.forbidden('Insufficient permissions');
    await loanApplicationService.submitApplication(params.id, session.user.id);
    return successResponse({ message: 'Application submitted for review' });
  } catch (error) {
    return errorResponse(error);
  }
}
