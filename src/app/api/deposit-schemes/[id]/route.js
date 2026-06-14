import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import depositSchemeService from '@/services/DepositSchemeService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view deposit schemes');
    }

    const { id } = await params;
    const scheme = await depositSchemeService.findById(id);
    if (!scheme) throw AppError.notFound('Deposit scheme not found');

    return successResponse(scheme);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to modify deposit schemes');
    }

    const { id } = await params;
    const body = await req.json();
    const scheme = await depositSchemeService.updateScheme(id, body, session.user.id);

    return successResponse(scheme, 200, { message: 'Deposit scheme updated successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.create')) {
      throw AppError.forbidden('You do not have permission to delete deposit schemes');
    }

    const { id } = await params;
    const scheme = await depositSchemeService.delete(id, session.user.id);

    return successResponse(scheme, 200, { message: 'Deposit scheme deleted successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
