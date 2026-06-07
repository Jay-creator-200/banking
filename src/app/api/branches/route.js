import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import branchService from '@/services/BranchService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { createBranchSchema } from '@/schemas/branch.schema.js';

export async function GET(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'branch.view')) {
      throw AppError.forbidden('You do not have permission to view branches');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const filter = {};
    if (search) {
      filter.$or = [
        { branchName: { $regex: search, $options: 'i' } },
        { branchCode: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sortOrder === 'desc' ? `-${sortField}` : sortField;

    const result = await branchService.findMany(filter, {
      page,
      limit,
      sort: sortOption,
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

export async function POST(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'branch.create')) {
      throw AppError.forbidden('You do not have permission to create branches');
    }

    const body = await req.json();
    const branch = await branchService.create(body, createBranchSchema, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log mutation audit
    await auditLogService.logAction(
      session.user.id,
      'branches',
      'CREATE_BRANCH',
      'branches',
      branch._id,
      null,
      branch.toObject ? branch.toObject() : branch,
      ip,
      ua
    );

    return successResponse(branch, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
