import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import cashSessionService from '@/services/CashSessionService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.view')) {
      throw AppError.forbidden('You do not have permission to view teller sessions');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const filter = {};
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('userId')) filter.userId = searchParams.get('userId');
    if (searchParams.get('status')) filter.status = searchParams.get('status').toLowerCase();
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filter.sessionDate = {
        $gte: new Date(searchParams.get('startDate')),
        $lte: new Date(searchParams.get('endDate')),
      };
    }

    const result = await cashSessionService.getSessions(filter, { page, limit });

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
    if (!hasPermission(session, 'teller.open_session')) {
      throw AppError.forbidden('You do not have permission to open teller sessions');
    }

    const body = await req.json();
    const cashSession = await cashSessionService.openSession(body, session.user.id);
    return successResponse(cashSession, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
