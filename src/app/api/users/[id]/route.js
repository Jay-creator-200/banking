import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import userService from '@/services/UserService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { updateUserSchema } from '@/schemas/user.schema.js';

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'user.view')) {
      throw AppError.forbidden('You do not have permission to view users');
    }

    const { id } = await params;
    const user = await userService.findById(id, ['roleId', 'branchId'], '-password');
    return successResponse(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'user.update')) {
      throw AppError.forbidden('You do not have permission to update users');
    }

    const { id } = await params;
    const body = await req.json();

    // Fetch user before updates for audit comparisons
    const original = await userService.findById(id, [], '-password');
    if (!original) throw AppError.notFound('User record not found');

    const updated = await userService.update(id, body, updateUserSchema, session.user.id);
    
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log the mutation audit trail
    const originalObj = original.toObject ? original.toObject() : original;
    const updatedObj = updated.toObject ? updated.toObject() : updated;
    delete updatedObj.password;

    await auditLogService.logAction(
      session.user.id,
      'users',
      'UPDATE_USER',
      'users',
      id,
      originalObj,
      updatedObj,
      ip,
      ua
    );

    return successResponse(updatedObj);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'user.delete')) {
      throw AppError.forbidden('You do not have permission to delete users');
    }

    const { id } = await params;

    // Fetch user before deleting
    const original = await userService.findById(id, [], '-password');
    if (!original) throw AppError.notFound('User record not found');

    await userService.delete(id, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log the mutation audit trail
    await auditLogService.logAction(
      session.user.id,
      'users',
      'DELETE_USER',
      'users',
      id,
      original.toObject ? original.toObject() : original,
      { isDeleted: true },
      ip,
      ua
    );

    return successResponse({ message: 'User deleted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
