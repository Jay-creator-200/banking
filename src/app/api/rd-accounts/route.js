import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import rdService from '@/services/RDService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import Member from '@/models/Member.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view RD accounts');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    const filter = {};
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('memberId')) filter.memberId = searchParams.get('memberId');
    if (searchParams.get('status')) filter.status = searchParams.get('status').toLowerCase();

    if (search) {
      const members = await Member.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const memberIds = members.map((m) => m._id);

      filter.$or = [
        { rdAccountNo: { $regex: search, $options: 'i' } },
        { memberId: { $in: memberIds } },
      ];
    }

    const result = await rdService.findMany(filter, {
      page,
      limit,
      sort: '-startDate',
      populate: ['memberId', 'branchId', 'schemeId'],
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
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to open RD accounts');
    }

    const body = await req.json();
    const account = await rdService.openAccount(body, session.user.id);

    return successResponse(account, 201, { message: 'RD account opened successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
