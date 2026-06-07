import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashSessionService from '@/services/CashSessionService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.view')) {
      throw AppError.forbidden('You do not have permission to view teller sessions');
    }

    const { id } = await params;
    const detail = await cashSessionService.getSessionDetail(id);
    return successResponse(detail, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
