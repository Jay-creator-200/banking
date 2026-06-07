import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import reversalService from '@/services/ReversalService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.view')) {
      throw AppError.forbidden('You do not have permission to view reversals');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status');

    const filter = {};
    if (status) {
      filter.status = status.toUpperCase();
    }

    const result = await reversalService.getReversals(filter, {
      page,
      limit,
      sort: '-requestedAt',
    });

    return successResponse(result.docs, 200, {
      total: result.total,
      limit: result.limit,
      page: result.page,
      pages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.reverse')) {
      throw AppError.forbidden('You do not have permission to reverse transactions');
    }

    const body = await req.json();
    const { transactionId, reason } = body;

    const reversal = await reversalService.requestReversal(transactionId, reason, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'transactions',
      'REQUEST_REVERSAL',
      'transactionreversals',
      reversal._id,
      null,
      reversal.toObject ? reversal.toObject() : reversal,
      ip,
      ua
    );

    return successResponse(reversal, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
