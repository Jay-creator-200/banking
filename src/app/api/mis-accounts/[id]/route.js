import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import misService from '@/services/MISService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view MIS accounts');
    }

    const { id } = await params;
    const account = await misService.repository.findDetailById(id);
    if (!account) throw AppError.notFound('MIS Account not found');

    return successResponse(account);
  } catch (error) {
    return errorResponse(error);
  }
}
