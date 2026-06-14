import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import fdService from '@/services/FDService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view FD accounts');
    }

    const { id } = await params;
    const account = await fdService.repository.findDetailById(id);
    if (!account) throw AppError.notFound('FD Account not found');

    return successResponse(account);
  } catch (error) {
    return errorResponse(error);
  }
}
