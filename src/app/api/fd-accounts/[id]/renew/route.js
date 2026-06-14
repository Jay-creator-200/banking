import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositMaturityService from '@/services/DepositMaturityService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to renew FD accounts');
    }

    const { id } = await params;
    const newFD = await depositMaturityService.renewFDAccount(id, session.user.id);

    return successResponse(newFD, 201, { message: 'FD Account renewed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
