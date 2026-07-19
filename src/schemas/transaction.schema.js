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
    'RD_DEPOSIT',
    'RD_DEPOSIT_TRANSFER',
    'RD_WITHDRAWAL',
    'RD_WITHDRAWAL_TRANSFER',
    'RD_INTEREST',
    'FD_DEPOSIT',
    'FD_DEPOSIT_TRANSFER',
    'FD_WITHDRAWAL',
    'FD_WITHDRAWAL_TRANSFER',
    'FD_INTEREST',
    'DDS_DEPOSIT',
    'DDS_DEPOSIT_TRANSFER',
    'DDS_WITHDRAWAL',
    'DDS_WITHDRAWAL_TRANSFER',
    'DDS_INTEREST',
    'MIS_DEPOSIT',
    'MIS_DEPOSIT_TRANSFER',
    'MIS_WITHDRAWAL',
    'MIS_WITHDRAWAL_TRANSFER',
    'MIS_PAYOUT',
    'MIS_PAYOUT_TRANSFER',
  ]),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI', 'RTGS', 'ONLINE']),
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
