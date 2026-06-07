import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import statementService from '@/services/StatementService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'savings.view')) {
      throw AppError.forbidden('You do not have permission to view statements');
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    if (!accountId) {
      throw AppError.validation('Account ID query parameter is required');
    }

    const mode = searchParams.get('mode') || 'statement'; // statement or passbook

    if (mode === 'passbook') {
      const result = await statementService.getPassbook(accountId);
      return successResponse(result, 200);
    } else {
      const filters = {
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        transactionType: searchParams.get('transactionType'),
      };
      const result = await statementService.getStatement(accountId, filters);
      return successResponse(result, 200);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
