import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositSchemeService from '@/services/DepositSchemeService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view deposit schemes');
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('schemeType');
    const filter = {};
    if (type) filter.schemeType = type.toUpperCase();

    const result = await depositSchemeService.findMany(filter, {
      sort: 'schemeCode',
    });

    return successResponse(result.docs || result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to create deposit schemes');
    }

    const body = await req.json();
    const scheme = await depositSchemeService.createScheme(body, session.user.id);

    return successResponse(scheme, 201, { message: 'Deposit scheme created successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
