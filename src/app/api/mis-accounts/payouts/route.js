import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import misService from '@/services/MISService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to trigger interest payouts');
    }

    const results = await misService.processDuePayouts(session.user.id);

    return successResponse(results, 200, { message: 'Interest payouts processed' });
  } catch (error) {
    return errorResponse(error);
  }
}
