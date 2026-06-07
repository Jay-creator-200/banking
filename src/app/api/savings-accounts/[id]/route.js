import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import savingsAccountService from '@/services/SavingsAccountService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'savings.view')) {
      throw AppError.forbidden('You do not have permission to view savings accounts');
    }

    const { id } = await params;
    // Use the custom detail fetcher from repository
    const account = await savingsAccountService.repository.findDetailById(id);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }

    return successResponse(account, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
