import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { AppError } from '@/utils/error-handler.js';
import connectDB from '@/lib/mongodb.js';
import User from '@/models/User.js';
import Branch from '@/models/Branch.js';
import AuditLog from '@/models/AuditLog.js';
import LoginLog from '@/models/LoginLog.js';

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('You must be logged in to view dashboard statistics');
    }

    await connectDB();

    const [usersCount, branchesCount, auditCount, loginCount] = await Promise.all([
      User.countDocuments(),
      Branch.countDocuments(),
      AuditLog.countDocuments(),
      LoginLog.countDocuments(),
    ]);

    return successResponse({
      users: usersCount,
      branches: branchesCount,
      auditLogs: auditCount,
      loginLogs: loginCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
