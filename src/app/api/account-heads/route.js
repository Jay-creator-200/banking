import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import accountHeadService from '@/services/AccountHeadService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.view')) {
      throw AppError.forbidden('You do not have permission to view Chart of Accounts');
    }

    const tree = await accountHeadService.getChartOfAccounts();
    return successResponse(tree, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.manage')) {
      throw AppError.forbidden('You do not have permission to modify Chart of Accounts');
    }

    const body = await req.json();
    const accountHead = await accountHeadService.createAccountHead(body, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'accounting',
      'CREATE_ACCOUNT_HEAD',
      'accountheads',
      accountHead._id,
      null,
      accountHead.toObject ? accountHead.toObject() : accountHead,
      ip,
      ua
    );

    return successResponse(accountHead, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
