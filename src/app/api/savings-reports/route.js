import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import savingsReportService from '@/services/SavingsReportService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'savings.view') && !hasPermission(session, 'report.view')) {
      throw AppError.forbidden('You do not have permission to view savings reports');
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType') || 'register';
    const branchId = searchParams.get('branchId') || null;

    let result;

    switch (reportType) {
      case 'register':
        const filters = {
          branchId,
          status: searchParams.get('status'),
          accountType: searchParams.get('accountType'),
        };
        result = await savingsReportService.getAccountsRegister(filters);
        break;

      case 'daily-transactions':
        const date = searchParams.get('date');
        result = await savingsReportService.getDailyTransactionReport(date, branchId);
        break;

      case 'dormant':
        result = await savingsReportService.getDormantAccounts(branchId);
        break;

      case 'frozen':
        result = await savingsReportService.getFrozenAccounts(branchId);
        break;

      case 'closed':
        result = await savingsReportService.getClosedAccounts(branchId);
        break;

      case 'openings':
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        result = await savingsReportService.getAccountOpenings(startDate, endDate, branchId);
        break;

      default:
        throw AppError.validation(`Invalid reportType '${reportType}' specified`);
    }

    return successResponse(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
