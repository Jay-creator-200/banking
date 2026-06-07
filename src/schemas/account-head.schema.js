import { z } from 'zod';
import { objectIdSchema } from './common/index.js';

export const createAccountHeadSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  code: z.string().trim().toUpperCase().min(3, 'Code must be at least 3 characters'),
  type: z.enum(['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY']),
  parentAccountId: objectIdSchema.optional().nullable(),
});

export const updateAccountHeadSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  parentAccountId: objectIdSchema.optional().nullable(),
});

export default {
  createAccountHeadSchema,
  updateAccountHeadSchema,
};
