import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loginLogService from '@/services/LoginLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';

export async function GET(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'loginlog.view')) {
      throw AppError.forbidden('You do not have permission to view login logs');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const filter = {};
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status) {
      filter.loginStatus = status.toUpperCase();
    }

    const result = await loginLogService.findMany(filter, {
      page,
      limit,
      sort: '-loggedInAt',
      populate: ['userId'],
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
