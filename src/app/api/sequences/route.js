import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import sequenceService from '@/services/SequenceService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    // Only administrators or auditors can view internal sequence registers
    if (!hasPermission(session, 'branch.view') && !hasPermission(session, 'user.view')) {
      throw AppError.forbidden('You do not have permission to view system sequences');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const filter = {};
    if (searchParams.get('prefix')) filter.prefix = searchParams.get('prefix').toUpperCase();
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('year')) filter.year = parseInt(searchParams.get('year'), 10);

    const result = await sequenceService.findMany(filter, {
      page,
      limit,
      sort: 'prefix branchId -year',
      populate: ['branchId'],
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
