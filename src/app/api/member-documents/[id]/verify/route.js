import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberDocumentService from '@/services/MemberDocumentService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to verify member documents');
    }

    const { id } = await params;
    const { status, remarks } = await req.json();

    const updatedDoc = await memberDocumentService.verifyDoc(id, status, remarks, session.user.id);

    return successResponse(updatedDoc, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
