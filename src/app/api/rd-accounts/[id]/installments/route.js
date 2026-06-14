import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import rdInstallmentRepository from '@/repositories/RDInstallmentRepository.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view RD installments');
    }

    const { id } = await params;
    const installments = await rdInstallmentRepository.model
      .find({ rdAccountId: id, isDeleted: false })
      .sort('installmentNo')
      .exec();

    return successResponse(installments);
  } catch (error) {
    return errorResponse(error);
  }
}
