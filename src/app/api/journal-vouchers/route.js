import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import ledgerService from '@/services/LedgerService.js';
import auditLogService from '@/services/AuditLogService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.view')) {
      throw AppError.forbidden('You do not have permission to view accounting records');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';

    const filter = {};
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('voucherType')) filter.voucherType = searchParams.get('voucherType').toUpperCase();

    // Date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.voucherDate = {};
      if (startDate) filter.voucherDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.voucherDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { voucherNo: { $regex: search, $options: 'i' } },
        { narration: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sortOrder === 'desc' ? `-${sortField}` : sortField;

    const result = await ledgerService.findMany(filter, {
      page,
      limit,
      sort: sortOption,
      populate: ['branchId'],
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
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.manage')) {
      throw AppError.forbidden('You do not have permission to record journal entries');
    }

    const body = await req.json();
    const voucher = await ledgerService.createVoucher(body, session.user.id);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    await auditLogService.logAction(
      session.user.id,
      'accounting',
      'CREATE_JOURNAL_VOUCHER',
      'journalvouchers',
      voucher._id,
      null,
      voucher.toObject ? voucher.toObject() : voucher,
      ip,
      ua
    );

    return successResponse(voucher, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
