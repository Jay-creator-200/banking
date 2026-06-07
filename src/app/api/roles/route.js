import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import roleService from '@/services/RoleService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { createRoleSchema } from '@/schemas/role.schema.js';

export async function GET(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'role.view')) {
      throw AppError.forbidden('You do not have permission to view roles');
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const result = await roleService.findMany(filter, { limit: 100 });
    return successResponse(result.docs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'role.create')) {
      throw AppError.forbidden('You do not have permission to create roles');
    }

    const body = await req.json();
    const role = await roleService.create(body, createRoleSchema, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log audit
    await auditLogService.logAction(
      session.user.id,
      'roles',
      'CREATE_ROLE',
      'roles',
      role._id,
      null,
      role.toObject ? role.toObject() : role,
      ip,
      ua
    );

    return successResponse(role, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
