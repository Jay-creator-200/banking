import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberService from '@/services/MemberService.js';
import memberRepository from '@/repositories/MemberRepository.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view members');
    }

    const { id } = await params;
    const member = await memberRepository.findDetailById(id);
    if (!member) {
      throw AppError.notFound('Member not found');
    }

    return successResponse(member, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to modify member profiles');
    }

    const { id } = await params;
    const body = await req.json();

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    const updatedMember = await memberService.updateMember(id, body, session.user.id, { ip, ua });

    return successResponse(updatedMember, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
