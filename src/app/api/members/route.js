import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberService from '@/services/MemberService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view members');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';

    const filter = {};
    if (searchParams.get('branchId')) filter.branchId = searchParams.get('branchId');
    if (searchParams.get('memberStatus')) filter.memberStatus = searchParams.get('memberStatus').toLowerCase();
    if (searchParams.get('kycStatus')) filter.kycStatus = searchParams.get('kycStatus').toLowerCase();

    // Date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.membershipDate = {};
      if (startDate) filter.membershipDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.membershipDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { memberNo: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
        { aadhaarNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = sortOrder === 'desc' ? `-${sortField}` : sortField;

    const result = await memberService.findMany(filter, {
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
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to register new members');
    }

    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    const member = await memberService.createMember(body, session.user.id, { ip, ua });

    return successResponse(member, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
