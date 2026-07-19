import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import salaryPaymentService from '@/services/SalaryPaymentService.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'user.view')) {
      throw AppError.forbidden('You do not have permission to view staff salary records');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const filter = {};
    if (branchId) filter.branchId = branchId;

    const salaries = await salaryPaymentService.list(filter);
    return successResponse(salaries);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'user.update')) {
      throw AppError.forbidden('You do not have permission to process staff salaries');
    }

    const body = await req.json();
    const salary = await salaryPaymentService.createAndPay(body, session.user.id);
    return successResponse(salary, 201, { message: 'Salary paid and posted as expense.' });
  } catch (error) {
    return errorResponse(error);
  }
}
