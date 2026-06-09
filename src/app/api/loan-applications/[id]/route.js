import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanApplicationService from '@/services/LoanApplicationService.js';
import guarantorService from '@/services/GuarantorService.js';
import collateralService from '@/services/CollateralService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const application = await loanApplicationService.getApplicationDetail(params.id);
    const guarantors = await guarantorService.getByApplication(params.id);
    const collaterals = await collateralService.getByApplication(params.id);

    return successResponse({ application, guarantors, collaterals });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.apply')) throw AppError.forbidden('Insufficient permissions');

    const body = await req.json();
    const application = await loanApplicationService.updateApplication(params.id, body, session.user.id);
    return successResponse(application);
  } catch (error) {
    return errorResponse(error);
  }
}
