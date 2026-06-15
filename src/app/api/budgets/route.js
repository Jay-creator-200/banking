import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import budgetService from '@/services/BudgetService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import Budget from '@/models/Budget.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, MANAGER
    if (!['SUPER_ADMIN', 'MANAGER'].includes(role)) {
      throw AppError.forbidden('Only Managers and Super Administrators can configure budgets.');
    }

    const body = await req.json();
    const branchId = body.branchId || session.user.branchId;

    if (!branchId || !body.fiscalYear || !body.department || !body.accountHeadId || body.allocatedAmount === undefined) {
      throw AppError.validation('Missing required budget parameters');
    }

    const result = await budgetService.updateBudget(
      {
        ...body,
        branchId,
      },
      session.user.id
    );

    return successResponse(result, 200, { message: 'Budget allocation updated successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}

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
      throw AppError.forbidden('You do not have permission to view budget allocations');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const fiscalYear = searchParams.get('fiscalYear');

    const query = {};
    if (branchId) query.branchId = branchId;
    if (fiscalYear) query.fiscalYear = fiscalYear;

    const list = await Budget.find(query)
      .populate('accountHeadId')
      .populate('branchId')
      .exec();

    return successResponse(list);
  } catch (error) {
    return errorResponse(error);
  }
}
