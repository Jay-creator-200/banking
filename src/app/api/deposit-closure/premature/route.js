import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositClosureService from '@/services/DepositClosureService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view deposit closures');
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const accountType = searchParams.get('accountType');

    if (!accountId || !accountType) {
      throw AppError.validation('Both accountId and accountType are required.');
    }

    const details = await depositClosureService.calculatePrematureClosure(accountId, accountType);
    return successResponse(details);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to close deposit accounts');
    }

    const body = await req.json();
    const transaction = await depositClosureService.requestPrematureClosure(body, session.user.id);

    return successResponse(transaction, 201, { message: 'Premature closure withdrawal request submitted' });
  } catch (error) {
    return errorResponse(error);
  }
}
