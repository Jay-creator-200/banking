import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import reconciliationService from '@/services/ReconciliationService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, MANAGER
    if (!['SUPER_ADMIN', 'MANAGER'].includes(role)) {
      throw AppError.forbidden('Only Managers and Super Administrators can perform manual reconciliation matching.');
    }

    const body = await req.json();
    const { reconciliationId, statementLineId, systemTransactionId } = body;

    if (!reconciliationId || !statementLineId || !systemTransactionId) {
      throw AppError.validation('Missing manual matching parameters (reconciliationId, statementLineId, systemTransactionId)');
    }

    const result = await reconciliationService.manualMatch({
      reconciliationId,
      statementLineId,
      systemTransactionId,
      userId: session.user.id,
    });

    return successResponse(result, 200, { message: 'Transaction matched successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
