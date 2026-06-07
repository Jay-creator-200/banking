import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashReportService from '@/services/CashReportService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

/**
 * GET /api/teller-reports?reportType=daily|vault|performance&branchId=...&date=...&startDate=...&endDate=...
 */
export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.view')) {
      throw AppError.forbidden('You do not have permission to view teller reports');
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType') || 'daily';
    const branchId = searchParams.get('branchId') || null;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || null;
    const endDate = searchParams.get('endDate') || null;

    let data;

    if (reportType === 'daily') {
      data = await cashReportService.getDailyCashPosition(branchId, date);
    } else if (reportType === 'vault') {
      data = await cashReportService.getVaultPositionReport(branchId, startDate, endDate);
    } else if (reportType === 'performance') {
      data = await cashReportService.getTellerPerformanceReport(branchId, startDate, endDate);
    } else {
      throw AppError.validation(`Unknown report type: ${reportType}`);
    }

    return successResponse(data, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
