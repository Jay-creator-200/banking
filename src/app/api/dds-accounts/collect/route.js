import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import ddsService from '@/services/DDSService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create') && !hasPermission(session, 'teller.create')) {
      throw AppError.forbidden('You do not have permission to collect DDS deposits');
    }

    const body = await req.json();
    const transaction = await ddsService.collectAmount(body, session.user.id);

    return successResponse(transaction, 201, { message: 'DDS collection request created successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
