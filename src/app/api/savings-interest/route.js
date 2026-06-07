import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import interestService from '@/services/InterestService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'savings.interest') && !hasPermission(session, 'savings.view')) {
      throw AppError.forbidden('You do not have permission to run interest calculations');
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountId || !startDate || !endDate) {
      throw AppError.validation('accountId, startDate, and endDate query parameters are required for calculations');
    }

    const calculation = await interestService.calculateInterest(accountId, startDate, endDate);
    return successResponse(calculation, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'savings.interest') && !hasPermission(session, 'savings.update')) {
      throw AppError.forbidden('You do not have permission to post batch interest credits');
    }

    const body = await req.json();
    const result = await interestService.postBatchInterest(body, session.user.id);

    return successResponse(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
