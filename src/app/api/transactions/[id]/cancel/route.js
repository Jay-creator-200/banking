import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import transactionService from '@/services/TransactionService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    // A user needs either transaction.create (maker can cancel their own) or transaction.cancel
    if (!hasPermission(session, 'transaction.create') && !hasPermission(session, 'transaction.cancel')) {
      throw AppError.forbidden('You do not have permission to cancel transactions');
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Cancelled by maker';

    const txn = await transactionService.cancelTransaction(id, session.user.id, reason);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'transactions',
      'CANCEL_TRANSACTION',
      'transactions',
      id,
      null,
      txn.toObject ? txn.toObject() : txn,
      ip,
      ua
    );

    return successResponse({ message: 'Transaction request cancelled successfully', transaction: txn }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
