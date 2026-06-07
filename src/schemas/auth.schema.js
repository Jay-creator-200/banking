import { z } from 'zod';
import { emailSchema, passwordSchema } from './common/index.js';

export const loginSchema = z.object({
  username: z.string().trim().min(3, { message: 'Username or Email must be at least 3 characters long' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  token: z.string().trim().min(1, { message: 'Reset token is required' }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, { message: 'Password confirmation is required' }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });
export default loginSchema;
