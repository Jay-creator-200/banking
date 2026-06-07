import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import roleService from '@/services/RoleService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { createRoleSchema } from '@/schemas/role.schema.js';

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'role.view')) {
      throw AppError.forbidden('You do not have permission to view roles');
    }

    const { id } = await params;
    const role = await roleService.findById(id);
    return successResponse(role);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'role.update')) {
      throw AppError.forbidden('You do not have permission to update roles');
    }

    const { id } = await params;
    const body = await req.json();

    const original = await roleService.findById(id);
    if (!original) throw AppError.notFound('Role record not found');

    const updated = await roleService.update(id, body, createRoleSchema.partial(), session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log audit
    await auditLogService.logAction(
      session.user.id,
      'roles',
      'UPDATE_ROLE',
      'roles',
      id,
      original.toObject ? original.toObject() : original,
      updated.toObject ? updated.toObject() : updated,
      ip,
      ua
    );

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'role.delete')) {
      throw AppError.forbidden('You do not have permission to delete roles');
    }

    const { id } = await params;

    const original = await roleService.findById(id);
    if (!original) throw AppError.notFound('Role record not found');

    // Protect SUPER_ADMIN from deletion
    if (original.code === 'SUPER_ADMIN') {
      throw AppError.badRequest('The SUPER_ADMIN role is protected and cannot be deleted.');
    }

    await roleService.delete(id, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log audit
    await auditLogService.logAction(
      session.user.id,
      'roles',
      'DELETE_ROLE',
      'roles',
      id,
      original.toObject ? original.toObject() : original,
      { isDeleted: true },
      ip,
      ua
    );

    return successResponse({ message: 'Role deleted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
