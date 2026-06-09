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
    if (!hasPermission(session, 'loan.approve')) throw AppError.forbidden('Insufficient permissions');
    const body = await req.json();
    const application = await loanApplicationService.rejectApplication(
      { applicationId: params.id, ...body },
      session.user.id
    );
    return successResponse(application, 200, { message: 'Application rejected' });
  } catch (error) {
    return errorResponse(error);
  }
}
