import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import userService from '@/services/UserService.js';
import auditLogService from '@/services/AuditLogService.js';
import { AppError } from '@/utils/error-handler.js';
import bcrypt from 'bcryptjs';
import { changePasswordSchema } from '@/schemas/auth.schema.js';

export async function PUT(req) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('You must be logged in to update your profile');
    }

    const body = await req.json();
    const userId = session.user.id;

    // Password change operation
    if (body.currentPassword || body.newPassword) {
      // Validate schema
      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success) {
        throw AppError.validation('Invalid password update parameters', parsed.error.flatten().fieldErrors);
      }

      const { currentPassword, newPassword } = parsed.data;

      // Verify old password
      const user = await userService.findById(userId);
      if (!user) throw AppError.notFound('User not found');

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new AppError(400, 'Your current password is incorrect', 'INVALID_PASSWORD');
      }

      // Perform update
      await userService.changePassword(userId, newPassword, userId);

      const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const ua = req.headers.get('user-agent') || 'Unknown';

      // Log audit action
      await auditLogService.logAction(
        userId,
        'users',
        'PASSWORD_CHANGE',
        'users',
        userId,
        null,
        { action: 'changed_password' },
        ip,
        ua
      );

      return successResponse({ message: 'Password updated successfully' });
    }

    // Profile photo or basic details change operation
    const original = await userService.findById(userId, [], '-password');
    const updatePayload = {};
    
    if (body.profilePhoto !== undefined) {
      updatePayload.profilePhoto = body.profilePhoto;
    }
    
    if (body.mobile !== undefined) {
      updatePayload.mobile = body.mobile;
    }

    const updated = await userService.update(userId, updatePayload, {}, userId);
    const updatedObj = updated.toObject ? updated.toObject() : updated;
    delete updatedObj.password;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';

    // Log audit
    await auditLogService.logAction(
      userId,
      'users',
      'UPDATE_PROFILE',
      'users',
      userId,
      original.toObject ? original.toObject() : original,
      updatedObj,
      ip,
      ua
    );

    return successResponse(updatedObj);
  } catch (error) {
    return errorResponse(error);
  }
}
