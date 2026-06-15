import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import budgetService from '@/services/BudgetService.js';
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
    // Authorized roles: SUPER_ADMIN, MANAGER, ACCOUNTANT, AUDITOR
    if (!['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'].includes(role)) {
      throw AppError.forbidden('You do not have permission to view budget comparison reports');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const fiscalYear = searchParams.get('fiscalYear') || '2026-2027';

    const report = await budgetService.getBudgetReport({
      branchId,
      fiscalYear,
    });

    const auditLogService = (await import('@/services/AuditLogService.js')).default;
    await auditLogService.logAction(
      session.user.id,
      'REPORT',
      'REPORT_GENERATED',
      'Budget',
      null,
      null,
      { reportType: 'BUDGET_VS_ACTUAL', branchId, fiscalYear }
    );

    return successResponse(report);
  } catch (error) {
    return errorResponse(error);
  }
}
