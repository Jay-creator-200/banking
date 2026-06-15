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
      throw AppError.forbidden('Only Managers and Super Administrators can perform Month End closings.');
    }

    const body = await req.json();
    const branchId = body.branchId || session.user.branchId;
    const year = parseInt(body.year, 10);
    const month = parseInt(body.month, 10);

    if (!branchId || !year || !month) {
      throw AppError.validation('Branch ID, Year, and Month are required parameters');
    }

    const result = await closingService.closeMonth({
      branchId,
      year,
      month,
      userId: session.user.id,
    });

    return successResponse(result, 200, { message: 'Month End closing completed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
