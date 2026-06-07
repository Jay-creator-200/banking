import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashTransferService from '@/services/CashTransferService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.view')) {
      throw AppError.forbidden('You do not have permission to view cash transfers');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const filter = {};
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('status')) filter.status = searchParams.get('status').toLowerCase();
    if (searchParams.get('transferType')) filter.transferType = searchParams.get('transferType');

    const result = await cashTransferService.getTransfers(filter, { page, limit });

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
    if (!hasPermission(session, 'teller.transfer')) {
      throw AppError.forbidden('You do not have permission to initiate cash transfers');
    }

    const body = await req.json();
    const transfer = await cashTransferService.requestTransfer(body, session.user.id);
    return successResponse(transfer, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
