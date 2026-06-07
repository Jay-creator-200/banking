import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import shareLedgerService from '@/services/ShareLedgerService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view share ledger');
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const filter = {};
    if (memberId) {
      filter.memberId = memberId;
    }

    const result = await shareLedgerService.findMany(filter, {
      page,
      limit,
      sort: '-purchaseDate',
      populate: ['memberId'],
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
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to purchase shares');
    }

    const body = await req.json();
    const purchaseResult = await shareLedgerService.purchaseShares(body, session.user.id);

    return successResponse(purchaseResult, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
