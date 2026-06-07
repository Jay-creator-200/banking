import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import branchService from '@/services/BranchService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { createBranchSchema } from '@/schemas/branch.schema.js';

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'branch.view')) {
      throw AppError.forbidden('You do not have permission to view branches');
    }

    const { id } = await params;
    const branch = await branchService.findById(id);
    return successResponse(branch);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'branch.update')) {
      throw AppError.forbidden('You do not have permission to update branches');
    }

    const { id } = await params;
    const body = await req.json();

    const original = await branchService.findById(id);
    if (!original) throw AppError.notFound('Branch record not found');

    const updated = await branchService.update(id, body, createBranchSchema.partial(), session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log mutation audit
    await auditLogService.logAction(
      session.user.id,
      'branches',
      'UPDATE_BRANCH',
      'branches',
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
    if (!hasPermission(session, 'branch.delete')) {
      throw AppError.forbidden('You do not have permission to delete branches');
    }

    const { id } = await params;

    const original = await branchService.findById(id);
    if (!original) throw AppError.notFound('Branch record not found');

    // Protect HO branch from deletion
    if (original.branchCode === 'HO') {
      throw AppError.badRequest('The Head Office branch is protected and cannot be deleted.');
    }

    await branchService.delete(id, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log mutation audit
    await auditLogService.logAction(
      session.user.id,
      'branches',
      'DELETE_BRANCH',
      'branches',
      id,
      original.toObject ? original.toObject() : original,
      { isDeleted: true },
      ip,
      ua
    );

    return successResponse({ message: 'Branch deleted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
