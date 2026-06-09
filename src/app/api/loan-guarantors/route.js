import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import guarantorService from '@/services/GuarantorService.js';
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
    const guarantors = await guarantorService.getByApplication(applicationId);
    return successResponse(guarantors);
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
    const guarantor = await guarantorService.addGuarantor(body, session.user.id);
    return successResponse(guarantor, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
