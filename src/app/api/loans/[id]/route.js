import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanAccountService from '@/services/LoanAccountService.js';
import loanScheduleService from '@/services/LoanScheduleService.js';
import loanPaymentService from '@/services/LoanPaymentService.js';
import penaltyService from '@/services/PenaltyService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const loan = await loanAccountService.getLoanDetail(params.id);
    const schedule = await loanScheduleService.getSchedule(params.id);
    const payments = await loanPaymentService.getPaymentHistory(params.id);
    const paymentSummary = await loanPaymentService.getPaymentSummary(params.id);
    const overdueSummary = ['active', 'overdue'].includes(loan.loanStatus)
      ? await penaltyService.getOverdueSummary(params.id)
      : null;

    return successResponse({ loan, schedule, payments, paymentSummary, overdueSummary });
  } catch (error) {
    return errorResponse(error);
  }
}
