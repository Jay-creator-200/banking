import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanScheduleService from '@/services/LoanScheduleService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');
    const { loanId } = await params;
    const schedule = await loanScheduleService.getSchedule(loanId);
    return successResponse(schedule);
  } catch (error) {
    return errorResponse(error);
  }
}
