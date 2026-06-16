import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import Member from '@/models/Member.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session) {
      throw AppError.unauthorized('You must be logged in.');
    }
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to register new members');
    }

    // Find all member codes matching /^NCS-\d+$/
    const allMatchingMembers = await Member.find({
      memberNo: /^NCS-\d+$/
    }, { memberNo: 1 });

    let maxNum = 0;
    for (const m of allMatchingMembers) {
      const suffix = m.memberNo.split('-')[1];
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    const nextCode = `NCS-${String(nextNum).padStart(4, '0')}`;

    return successResponse({ nextCode }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
