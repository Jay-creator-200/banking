import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: 'Role name must be at least 3 characters long' })
    .max(50, { message: 'Role name cannot exceed 50 characters' }),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, { message: 'Role code must be at least 3 characters long' })
    .regex(/^[A-Z0-9_]+$/, { message: 'Role code can only contain uppercase letters, numbers, and underscores' }),
  description: z.string().trim().max(255, { message: 'Description cannot exceed 255 characters' }).optional(),
});
