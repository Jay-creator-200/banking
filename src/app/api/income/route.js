import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import incomeService from '@/services/IncomeService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, ACCOUNTANT, CASHIER
    if (!['SUPER_ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(role)) {
      throw AppError.forbidden('Only Accountants, Cashiers, and Super Administrators can record income entries.');
    }

    const body = await req.json();
    const branchId = body.branchId || session.user.branchId;

    if (!branchId || !body.category || !body.amount || !body.paymentMode || !body.receivedFrom || !body.accountHeadId) {
      throw AppError.validation('Missing required income entry parameters');
    }

    const result = await incomeService.createIncome(
      {
        ...body,
        branchId,
      },
      session.user.id
    );

    return successResponse(result, 201, { message: 'Income entry recorded and posted to ledger.' });
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
    // Authorized roles: SUPER_ADMIN, MANAGER, ACCOUNTANT, AUDITOR, CASHIER
    if (!['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR', 'CASHIER'].includes(role)) {
      throw AppError.forbidden('You do not have permission to view income entries');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const category = searchParams.get('category');

    const query = {};
    if (branchId) query.branchId = branchId;
    if (category) query.category = category;

    const list = await incomeService.getIncomeEntries(query, { sort: '-createdAt' });

    return successResponse(list);
  } catch (error) {
    return errorResponse(error);
  }
}
