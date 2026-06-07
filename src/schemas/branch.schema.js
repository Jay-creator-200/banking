import { z } from 'zod';
import { emailSchema } from './common/index.js';

export const createBranchSchema = z.object({
  branchCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, { message: 'Branch code must be at least 2 characters long' })
    .max(10, { message: 'Branch code cannot exceed 10 characters' })
    .regex(/^[A-Z0-9]+$/, { message: 'Branch code can only contain alphanumeric uppercase characters' }),
  branchName: z
    .string()
    .trim()
    .min(3, { message: 'Branch name must be at least 3 characters long' })
    .max(100, { message: 'Branch name cannot exceed 100 characters' }),
  address: z.string().trim().min(5, { message: 'Address must be at least 5 characters long' }).optional().or(z.literal('')),
  city: z.string().trim().min(2, { message: 'City must be at least 2 characters long' }).optional().or(z.literal('')),
  state: z.string().trim().min(2, { message: 'State must be at least 2 characters long' }).optional().or(z.literal('')),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: 'Pincode must be a valid 6-digit Indian postal code' })
    .optional()
    .or(z.literal('')),
  contactNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, { message: 'Contact number must be a valid 10-digit telephone number' })
    .optional()
    .or(z.literal('')),
  email: emailSchema.optional().or(z.literal('')),
});
