import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashTransferService from '@/services/CashTransferService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.approve_transfer')) {
      throw AppError.forbidden('You do not have permission to approve cash transfers');
    }

    const body = await req.json();
    const transfer = await cashTransferService.processTransfer(body, session.user.id);
    return successResponse(transfer, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
