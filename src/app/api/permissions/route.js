import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import permissionService from '@/services/PermissionService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';

export async function GET(req) {
  try {
    const session = await auth();
    // Allow read permissions to users who can view roles or permissions
    if (!hasPermission(session, 'role.view') && !hasPermission(session, 'rolepermission.view')) {
      throw AppError.forbidden('You do not have permission to view system permissions');
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { module: { $regex: search, $options: 'i' } },
      ];
    }

    const result = await permissionService.findMany(filter, { limit: 150, sort: 'module code' });
    return successResponse(result.docs);
  } catch (error) {
    return errorResponse(error);
  }
}
