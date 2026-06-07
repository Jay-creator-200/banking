import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashSessionService from '@/services/CashSessionService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.view')) {
      throw AppError.forbidden('You do not have permission to view teller sessions');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      throw AppError.validation('branchId is required');
    }

    const activeSession = await cashSessionService.getActiveSession(session.user.id, branchId);
    return successResponse(activeSession, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
