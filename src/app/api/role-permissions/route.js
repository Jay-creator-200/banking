import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import roleService from '@/services/RoleService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { z } from 'zod';
import { objectIdSchema } from '@/schemas/common/index.js';

const mappingPayloadSchema = z.object({
  roleId: objectIdSchema,
  permissionIds: z.array(objectIdSchema),
});

export async function GET(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'role.view') && !hasPermission(session, 'rolepermission.view')) {
      throw AppError.forbidden('You do not have permission to view role mappings');
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      throw AppError.badRequest('Query parameter roleId is required');
    }

    const mappings = await roleService.getPermissionsForRole(roleId);
    return successResponse(mappings.docs);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'rolepermission.update')) {
      throw AppError.forbidden('You do not have permission to assign permissions to roles');
    }

    const body = await req.json();
    
    // Validate schema
    const parsed = mappingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Validation failed for role permission updates', parsed.error.flatten().fieldErrors);
    }

    const { roleId, permissionIds } = parsed.data;

    // Verify role isn't SUPER_ADMIN (its mappings are protected)
    const role = await roleService.findById(roleId);
    if (!role) throw AppError.notFound('Role not found');
    if (role.code === 'SUPER_ADMIN') {
      throw AppError.badRequest('SUPER_ADMIN permissions are read-only and automatically contain all permissions.');
    }

    // Retrieve original mappings for audit
    const originalMappings = await roleService.getPermissionsForRole(roleId);
    const oldIds = originalMappings.docs ? originalMappings.docs.map(m => m.permissionId?._id?.toString()).filter(Boolean) : [];

    // Perform bulk replacement mapping
    const result = await roleService.assignPermissionsToRole(roleId, permissionIds);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log audit action
    await auditLogService.logAction(
      session.user.id,
      'roles',
      'ROLE_ASSIGNMENT',
      'roles',
      roleId,
      { permissions: oldIds },
      { permissions: permissionIds },
      ip,
      ua
    );

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
