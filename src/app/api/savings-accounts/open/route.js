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
    if (!hasPermission(session, 'savings.create') && !hasPermission(session, 'savings.open')) {
      throw AppError.forbidden('You do not have permission to open savings accounts');
    }

    const body = await req.json();
    const account = await savingsAccountService.openAccount(body, session.user.id);

    return successResponse(account, 210, { message: 'Savings account opened successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
