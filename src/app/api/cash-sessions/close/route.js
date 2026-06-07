import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashSessionService from '@/services/CashSessionService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.close_session')) {
      throw AppError.forbidden('You do not have permission to close teller sessions');
    }

    const body = await req.json();
    const cashSession = await cashSessionService.closeSession(body, session.user.id);
    return successResponse(cashSession, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
