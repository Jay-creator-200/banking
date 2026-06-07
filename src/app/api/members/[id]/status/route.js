import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberService from '@/services/MemberService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to change member status');
    }

    const { id } = await params;
    const { status, remarks } = await req.json();

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    const updatedMember = await memberService.updateStatus(id, status, remarks, session.user.id, { ip, ua });

    return successResponse(updatedMember, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
