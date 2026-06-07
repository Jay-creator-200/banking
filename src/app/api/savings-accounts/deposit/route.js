import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositService from '@/services/DepositService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.create') && !hasPermission(session, 'savings.deposit')) {
      throw AppError.forbidden('You do not have permission to post deposits');
    }

    const body = await req.json();
    const transaction = await depositService.depositFunds(body, session.user.id);

    return successResponse(transaction, 201, { message: 'Deposit request created and queued for approval' });
  } catch (error) {
    return errorResponse(error);
  }
}
