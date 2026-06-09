import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanProductService from '@/services/LoanProductService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');
    const filter = {};
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const result = await loanProductService.listProducts(filter, {
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    return successResponse({ docs: result.docs, meta: { total: result.total, page: result.page, pages: result.pages } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.manage')) throw AppError.forbidden('Insufficient permissions');

    const body = await req.json();
    const product = await loanProductService.createProduct(body, session.user.id);
    return successResponse(product, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
