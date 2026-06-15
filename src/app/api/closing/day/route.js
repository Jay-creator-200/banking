import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import closingService from '@/services/ClosingService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, MANAGER
    if (!['SUPER_ADMIN', 'MANAGER'].includes(role)) {
      throw AppError.forbidden('Only Managers and Super Administrators can perform Day End closings.');
    }

    const body = await req.json();
    const branchId = body.branchId || session.user.branchId;
    if (!branchId) {
      throw AppError.validation('Branch ID is required');
    }

    const result = await closingService.closeBusinessDay({
      branchId,
      userId: session.user.id,
    });

    return successResponse(result, 200, { message: 'Day End closing completed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
