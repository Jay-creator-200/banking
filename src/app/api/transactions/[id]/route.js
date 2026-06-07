import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import transactionRepository from '@/repositories/TransactionRepository.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.view')) {
      throw AppError.forbidden('You do not have permission to view transactions');
    }

    const { id } = await params;
    const txn = await transactionRepository.findDetailById(id);
    if (!txn) {
      throw AppError.notFound('Transaction not found');
    }

    return successResponse(txn, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
