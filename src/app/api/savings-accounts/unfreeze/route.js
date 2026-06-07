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
    if (!hasPermission(session, 'savings.update') && !hasPermission(session, 'savings.unfreeze')) {
      throw AppError.forbidden('You do not have permission to unfreeze savings accounts');
    }

    const body = await req.json();
    const account = await savingsAccountService.unfreezeAccount(body, session.user.id);

    return successResponse(account, 200, { message: 'Savings account unfrozen successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
