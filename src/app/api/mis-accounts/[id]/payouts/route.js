import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import misService from '@/services/MISService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import MISAccount from '@/models/MISAccount.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to trigger MIS payouts');
    }

    const { id } = await params;
    const misAccount = await MISAccount.findById(id);
    if (!misAccount) throw AppError.notFound('MIS Account not found');
    if (misAccount.status !== 'active') {
      throw AppError.validation(`MIS Account is not active (status: ${misAccount.status})`);
    }

    const transaction = await misService.processPayout(misAccount, session.user.id);
    return successResponse(transaction, 201, {
      message: 'MIS payout transaction submitted for approval',
      nextPayoutDate: misAccount.nextPayoutDate,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
