import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import savingsAccountService from '@/services/SavingsAccountService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'savings.close') && !hasPermission(session, 'savings.update')) {
      throw AppError.forbidden('You do not have permission to close savings accounts');
    }

    const body = await req.json();
    const account = await savingsAccountService.closeAccount(body, session.user.id);

    return successResponse(account, 200, { message: 'Savings account closed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
