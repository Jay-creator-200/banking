import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositInterestService from '@/services/DepositInterestService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session) {
      throw AppError.unauthorized('Unauthorized access');
    }

    const body = await req.json();
    const result = depositInterestService.calculateMaturity(body);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
