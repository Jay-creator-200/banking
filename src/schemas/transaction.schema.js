import { z } from 'zod';
import { objectIdSchema, paginationSchema } from './common/index.js';

export const createTransactionSchema = z.object({
  branchId: objectIdSchema,
  memberId: objectIdSchema.optional().nullable(),
  accountType: z.enum(['savings', 'loan', 'scheme', 'share', 'membership', 'interest', 'general']),
  accountId: z.string().trim().optional().nullable(),
  transactionType: z.enum([
    'SAVINGS_DEPOSIT',
    'SAVINGS_WITHDRAWAL',
    'LOAN_DISBURSEMENT',
    'LOAN_INSTALLMENT',
    'MEMBERSHIP_FEE',
    'SHARE_PURCHASE',
    'INTEREST_CREDIT',
  ]),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI']),
  amount: z.number().positive({ message: 'Amount must be greater than zero' }),
  referenceNo: z.string().trim().max(100).optional().nullable(),
  narration: z.string().trim().max(500).optional().nullable(),
  sourceCollection: z.string().trim().optional().nullable(),
  sourceId: z.string().trim().optional().nullable(),
  // Optional: link to active teller session for CASH transactions
  sessionId: objectIdSchema.optional().nullable(),
});

export const searchTransactionSchema = paginationSchema.extend({
  branchId: z.string().trim().optional(),
  memberId: z.string().trim().optional(),
  accountType: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  transactionType: z.string().trim().optional(),
  status: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export default {
  createTransactionSchema,
  searchTransactionSchema,
};
