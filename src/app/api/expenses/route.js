import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import expenseService from '@/services/ExpenseService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import Expense from '@/models/Expense.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, ACCOUNTANT
    if (!['SUPER_ADMIN', 'ACCOUNTANT'].includes(role)) {
      throw AppError.forbidden('Only Accountants and Super Administrators can record expenses.');
    }

    const body = await req.json();
    const branchId = body.branchId || session.user.branchId;

    if (!branchId || !body.category || !body.amount || !body.paymentMode || !body.vendor || !body.accountHeadId) {
      throw AppError.validation('Missing required expense parameters');
    }

    const result = await expenseService.createExpense(
      {
        ...body,
        branchId,
      },
      session.user.id
    );

    return successResponse(result, 201, { message: 'Expense request registered and submitted for approval.' });
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
      throw AppError.forbidden('You do not have permission to view expense records');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const approvalStatus = searchParams.get('approvalStatus');

    const query = {};
    if (branchId) query.branchId = branchId;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const list = await Expense.find(query)
      .populate('accountHeadId')
      .populate('branchId')
      .populate('voucherId')
      .sort({ createdAt: -1 })
      .exec();

    return successResponse(list);
  } catch (error) {
    return errorResponse(error);
  }
}
