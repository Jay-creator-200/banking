import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import ledgerService from '@/services/LedgerService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.view')) {
      throw AppError.forbidden('You do not have permission to view ledger entries');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortField = searchParams.get('sortField') || 'entryDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const filter = {};
    if (searchParams.get('accountHeadId')) filter.accountHeadId = searchParams.get('accountHeadId');
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('transactionId')) filter.transactionId = searchParams.get('transactionId');
    if (searchParams.get('memberId')) filter.memberId = searchParams.get('memberId');

    // Date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.entryDate = {};
      if (startDate) filter.entryDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.entryDate.$lte = end;
      }
    }

    const sortOption = sortOrder === 'desc' ? `-${sortField}` : sortField;

    const result = await ledgerService.getLedgerEntries(filter, {
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
