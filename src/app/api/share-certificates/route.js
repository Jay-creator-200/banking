import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import shareCertificateService from '@/services/ShareCertificateService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view share certificates');
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const filter = {};
    if (memberId) {
      filter.memberId = memberId;
    }

    const result = await shareCertificateService.findMany(filter, {
      page,
      limit,
      sort: '-issuedDate',
      populate: ['memberId'],
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
