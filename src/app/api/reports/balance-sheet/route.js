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
      throw AppError.forbidden('You do not have permission to view Balance Sheet reports');
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString();
    const branchId = searchParams.get('branchId');

    const report = await financialReportService.getBalanceSheet({
      date,
      branchId,
    });

    const auditLogService = (await import('@/services/AuditLogService.js')).default;
    await auditLogService.logAction(
      session.user.id,
      'REPORT',
      'REPORT_GENERATED',
      'AccountHead',
      null,
      null,
      { reportType: 'BALANCE_SHEET', branchId, date }
    );

    return successResponse(report);
  } catch (error) {
    return errorResponse(error);
  }
}
