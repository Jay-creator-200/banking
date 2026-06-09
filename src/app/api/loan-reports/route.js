import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanReportService from '@/services/LoanReportService.js';
import foreclosureService from '@/services/ForeclosureService.js';
import loanAccountService from '@/services/LoanAccountService.js';
import penaltyService from '@/services/PenaltyService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

/**
 * GET /api/loan-reports?reportType=register|disbursement|collection|overdue|product|branch
 * POST /api/loan-reports — special actions: foreclosure, overdue-scan
 */
export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType') || 'register';
    const branchId = searchParams.get('branchId') || null;
    const startDate = searchParams.get('startDate') || null;
    const endDate = searchParams.get('endDate') || null;

    let data;
    switch (reportType) {
      case 'register':
        data = await loanReportService.getLoanRegister(branchId, startDate, endDate);
        break;
      case 'disbursement':
        data = await loanReportService.getDisbursementReport(branchId, startDate, endDate);
        break;
      case 'collection':
        data = await loanReportService.getCollectionReport(branchId, startDate, endDate);
        break;
      case 'overdue':
        data = await loanReportService.getOverdueReport(branchId);
        break;
      case 'product':
        data = await loanReportService.getProductWiseReport(branchId);
        break;
      case 'branch':
        data = await loanReportService.getBranchWiseReport();
        break;
      case 'foreclosure-calc': {
        const loanId = searchParams.get('loanId');
        if (!loanId) throw AppError.validation('loanId is required for foreclosure calculation');
        data = await foreclosureService.calculateForeclosure(loanId);
        break;
      }
      case 'overdue-summary': {
        const loanId = searchParams.get('loanId');
        if (!loanId) throw AppError.validation('loanId is required for overdue summary');
        data = await penaltyService.getOverdueSummary(loanId);
        break;
      }
      default:
        throw AppError.validation(`Unknown reportType: ${reportType}`);
    }

    return successResponse(data, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'foreclosure') {
      if (!hasPermission(session, 'loan.manage')) throw AppError.forbidden('Insufficient permissions');
      const body = await req.json();
      const result = await foreclosureService.executeForeclosure(body, session.user.id);
      return successResponse(result, 200, { message: 'Foreclosure executed successfully' });
    }

    if (action === 'overdue-scan') {
      if (!hasPermission(session, 'loan.manage')) throw AppError.forbidden('Insufficient permissions');
      const result = await loanAccountService.runOverdueScan(session.user.id);
      return successResponse(result, 200, { message: `Overdue scan complete. ${result.updated} loans updated.` });
    }

    if (action === 'apply-penalties') {
      if (!hasPermission(session, 'loan.manage')) throw AppError.forbidden('Insufficient permissions');
      const body = await req.json();
      const result = await penaltyService.applyPenalties(body.loanId, session.user.id);
      return successResponse(result, 200);
    }

    throw AppError.validation(`Unknown action: ${action}`);
  } catch (error) {
    return errorResponse(error);
  }
}
