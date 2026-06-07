import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';

export async function GET(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'audit.view')) {
      throw AppError.forbidden('You do not have permission to view audit logs');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const moduleName = searchParams.get('moduleName') || '';
    const actionName = searchParams.get('actionName') || '';

    const filter = {};
    
    if (search) {
      filter.$or = [
        { userId: { $regex: search, $options: 'i' } },
        { moduleName: { $regex: search, $options: 'i' } },
        { actionName: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (moduleName) {
      filter.moduleName = moduleName;
    }
    
    if (actionName) {
      filter.actionName = actionName;
    }

    const result = await auditLogService.findMany(filter, {
      page,
      limit,
      sort: '-createdAt',
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
