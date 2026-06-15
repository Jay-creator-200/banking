import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import reconciliationService from '@/services/ReconciliationService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, MANAGER, ACCOUNTANT, AUDITOR, CASHIER
    if (!['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR', 'CASHIER'].includes(role)) {
      throw AppError.forbidden('You do not have permission to view cash reconciliation reports');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || session.user.branchId;
    const date = searchParams.get('date') || new Date().toISOString();

    if (!branchId) {
      throw AppError.validation('Branch ID is required');
    }

    const report = await reconciliationService.getCashReconciliationReport({
      branchId,
      date,
    });

    return successResponse(report);
  } catch (error) {
    return errorResponse(error);
  }
}
