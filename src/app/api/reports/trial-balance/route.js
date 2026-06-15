import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import financialReportService from '@/services/FinancialReportService.js';
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
      throw AppError.forbidden('You do not have permission to view Trial Balance reports');
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const branchId = searchParams.get('branchId');
    const accountGroup = searchParams.get('accountGroup');

    const report = await financialReportService.getTrialBalance({
      startDate,
      endDate,
      branchId,
      accountGroup,
    });

    // Audit Log report generation
    const auditLogService = (await import('@/services/AuditLogService.js')).default;
    await auditLogService.logAction(
      session.user.id,
      'REPORT',
      'REPORT_GENERATED',
      'AccountHead',
      null,
      null,
      { reportType: 'TRIAL_BALANCE', branchId, startDate, endDate }
    );

    return successResponse(report);
  } catch (error) {
    return errorResponse(error);
  }
}
