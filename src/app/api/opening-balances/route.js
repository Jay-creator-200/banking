import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import openingBalanceService from '@/services/OpeningBalanceService.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.manage')) {
      throw AppError.forbidden('You do not have permission to post opening balances');
    }

    const body = await req.json();
    const voucher = await openingBalanceService.postOpeningBalance(body, session.user.id);
    return successResponse(voucher, 201, { message: 'Opening balance posted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
