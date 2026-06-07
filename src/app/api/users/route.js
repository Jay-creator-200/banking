import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import userService from '@/services/UserService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import { createUserSchema } from '@/schemas/user.schema.js';

export async function GET(req) {
  try {
    const session = await auth();
    if (!hasPermission(session, 'user.view')) {
      throw AppError.forbidden('You do not have permission to view users');
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
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sortOrder === 'desc' ? `-${sortField}` : sortField;

    const result = await userService.findMany(filter, {
      page,
      limit,
      sort: sortOption,
      populate: ['roleId', 'branchId'],
      select: '-password',
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
    if (!hasPermission(session, 'user.create')) {
      throw AppError.forbidden('You do not have permission to create users');
    }

    const body = await req.json();
    const user = await userService.create(body, createUserSchema, session.user.id);
    
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log the mutation audit trail
    const cleanUser = user.toObject ? user.toObject() : user;
    const auditPayload = { ...cleanUser };
    delete auditPayload.password;

    await auditLogService.logAction(
      session.user.id,
      'users',
      'CREATE_USER',
      'users',
      user._id,
      null,
      auditPayload,
      ip,
      ua
    );

    return successResponse(auditPayload, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
