import { z } from 'zod';
import { objectIdSchema } from './common/index.js';

export const createApprovalSchema = z.object({
  moduleName: z.string().trim().min(1, 'Module name is required'),
  referenceCollection: z.string().trim().min(1, 'Reference collection is required'),
  referenceId: objectIdSchema,
  requestType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'REVERSAL']),
});

export const approveSchema = z.object({
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const rejectSchema = z.object({
  remarks: z.string().trim().min(1, 'Remarks are required for rejection').max(500),
});

export default {
  createApprovalSchema,
  approveSchema,
  rejectSchema,
};
