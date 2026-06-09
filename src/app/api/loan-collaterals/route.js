import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import collateralService from '@/services/CollateralService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');
    if (!applicationId) throw AppError.validation('applicationId is required');
    const collaterals = await collateralService.getByApplication(applicationId);
    return successResponse(collaterals);
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
    const collateral = await collateralService.addCollateral(body, session.user.id);
    return successResponse(collateral, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
