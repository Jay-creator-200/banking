import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import transactionService from '@/services/TransactionService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.view')) {
      throw AppError.forbidden('You do not have permission to view transactions');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';

    // Filters
    const filter = {};
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('memberId')) filter.memberId = searchParams.get('memberId');
    if (searchParams.get('accountType')) filter.accountType = searchParams.get('accountType');
    if (searchParams.get('accountId')) filter.accountId = searchParams.get('accountId');
    if (searchParams.get('transactionType')) filter.transactionType = searchParams.get('transactionType');
    if (searchParams.get('status')) filter.status = searchParams.get('status').toUpperCase();

    // Date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search query
    if (search) {
      filter.$or = [
        { transactionNo: { $regex: search, $options: 'i' } },
        { referenceNo: { $regex: search, $options: 'i' } },
        { narration: { $regex: search, $options: 'i' } },
        { accountId: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sortOrder === 'desc' ? `-${sortField}` : sortField;

    const result = await transactionService.getTransactions(filter, {
      page,
      limit,
      sort: sortOption,
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
    if (!hasPermission(session, 'transaction.create')) {
      throw AppError.forbidden('You do not have permission to initiate transactions');
    }

    const body = await req.json();
    const txn = await transactionService.createTransaction(body, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'transactions',
      'CREATE_TRANSACTION',
      'transactions',
      txn._id,
      null,
      txn.toObject ? txn.toObject() : txn,
      ip,
      ua
    );

    return successResponse(txn, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
