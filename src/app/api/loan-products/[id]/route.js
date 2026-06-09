import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import loanProductService from '@/services/LoanProductService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.view')) throw AppError.forbidden('Insufficient permissions');
    const product = await loanProductService.getProduct(params.id);
    return successResponse(product);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.manage')) throw AppError.forbidden('Insufficient permissions');
    const body = await req.json();
    const product = await loanProductService.updateProduct(params.id, body, session.user.id);
    return successResponse(product);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'loan.manage')) throw AppError.forbidden('Insufficient permissions');
    const product = await loanProductService.toggleStatus(params.id, session.user.id);
    return successResponse(product);
  } catch (error) {
    return errorResponse(error);
  }
}
