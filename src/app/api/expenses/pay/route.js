import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import expenseService from '@/services/ExpenseService.js';
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
      throw AppError.forbidden('Only Accountants, Cashiers, and Super Administrators can execute expense payments.');
    }

    const body = await req.json();
    const { expenseId } = body;

    if (!expenseId) {
      throw AppError.validation('Expense ID is required');
    }

    const result = await expenseService.payExpense(expenseId, session.user.id);

    return successResponse(result, 200, { message: 'Expense payment executed and posted to ledger.' });
  } catch (error) {
    return errorResponse(error);
  }
}
