import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import rdService from '@/services/RDService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create') && !hasPermission(session, 'teller.create')) {
      throw AppError.forbidden('You do not have permission to collect RD installments');
    }

    const body = await req.json();
    const transaction = await rdService.collectInstallment(body, session.user.id);

    return successResponse(transaction, 201, { message: 'RD installment collection request created successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
