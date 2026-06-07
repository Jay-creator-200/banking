import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import nomineeService from '@/services/NomineeService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view member nominees');
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      throw AppError.validation('memberId is required');
    }

    const nominees = await nomineeService.getNominees(memberId);
    return successResponse(nominees, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to manage nominees');
    }

    const { memberId, nominees } = await req.json();
    if (!memberId) {
      throw AppError.validation('memberId is required');
    }
    if (!Array.isArray(nominees)) {
      throw AppError.validation('nominees must be an array');
    }

    const savedNominees = await nomineeService.saveNominees(memberId, nominees, session.user.id);
    return successResponse(savedNominees, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
