import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositMaturityService from '@/services/DepositMaturityService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to close deposit accounts');
    }

    const body = await req.json();
    const transaction = await depositMaturityService.liquidateMaturedAccount(
      body.accountId,
      body.accountType,
      body.paymentMode || 'CASH',
      body.destSavingsAccountNo || body.fundingSavingsAccountNo || null,
      session.user.id
    );

    return successResponse(transaction, 201, { message: 'Liquidation withdrawal request submitted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
