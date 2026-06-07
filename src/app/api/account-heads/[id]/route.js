import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import accountHeadService from '@/services/AccountHeadService.js';
import accountHeadRepository from '@/repositories/AccountHeadRepository.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.view')) {
      throw AppError.forbidden('You do not have permission to view Chart of Accounts');
    }

    const { id } = await params;
    const accountHead = await accountHeadRepository.findDetailById(id);
    if (!accountHead) {
      throw AppError.notFound('Account head not found');
    }

    return successResponse(accountHead, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.manage')) {
      throw AppError.forbidden('You do not have permission to modify Chart of Accounts');
    }

    const { id } = await params;
    const body = await req.json();
    
    const oldHead = await accountHeadRepository.findById(id);
    if (!oldHead) {
      throw AppError.notFound('Account head not found');
    }

    const accountHead = await accountHeadService.updateAccountHead(id, body, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'accounting',
      'UPDATE_ACCOUNT_HEAD',
      'accountheads',
      id,
      oldHead.toObject ? oldHead.toObject() : oldHead,
      accountHead.toObject ? accountHead.toObject() : accountHead,
      ip,
      ua
    );

    return successResponse(accountHead, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.manage')) {
      throw AppError.forbidden('You do not have permission to delete Account Heads');
    }

    const { id } = await params;
    const oldHead = await accountHeadRepository.findById(id);
    if (!oldHead) {
      throw AppError.notFound('Account head not found');
    }

    const accountHead = await accountHeadService.delete(id, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'accounting',
      'DELETE_ACCOUNT_HEAD',
      'accountheads',
      id,
      oldHead.toObject ? oldHead.toObject() : oldHead,
      null,
      ip,
      ua
    );

    return successResponse({ message: 'Account head deleted successfully', accountHead }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
