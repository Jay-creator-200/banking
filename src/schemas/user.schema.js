import { z } from 'zod';
import { emailSchema, mobileSchema, passwordSchema, objectIdSchema } from './common/index.js';

export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { message: 'Full name must be at least 3 characters long' })
    .max(100, { message: 'Full name cannot exceed 100 characters' }),
  email: emailSchema,
  mobile: mobileSchema,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, { message: 'Username must be at least 4 characters long' })
    .regex(/^[a-z0-9_]+$/, { message: 'Username can only contain lowercase letters, numbers, and underscores' }),
  employeeCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, { message: 'Employee code must be at least 3 characters long' })
    .regex(/^[A-Z0-9-]+$/, { message: 'Employee code can only contain uppercase letters, numbers, and dashes' }),
  password: passwordSchema,
  roleId: objectIdSchema,
  branchId: objectIdSchema,
  profilePhoto: z.string().trim().url({ message: 'Invalid profile photo URL' }).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED', 'DRAFT']).default('ACTIVE'),
});

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { message: 'Full name must be at least 3 characters long' })
    .max(100, { message: 'Full name cannot exceed 100 characters' })
    .optional(),
  email: emailSchema.optional(),
  mobile: mobileSchema.optional(),
  roleId: objectIdSchema.optional(),
  branchId: objectIdSchema.optional(),
  profilePhoto: z.string().trim().url({ message: 'Invalid profile photo URL' }).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED', 'DRAFT']).optional(),
});
