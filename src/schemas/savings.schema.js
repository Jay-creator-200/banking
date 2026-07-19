import { z } from 'zod';
import { objectIdSchema, dateSchema } from './common/index.js';

export const openSavingsAccountSchema = z.object({
  memberId: objectIdSchema,
  branchId: objectIdSchema,
  accountType: z.enum(['regular', 'staff', 'senior_citizen']).default('regular'),
  openingDeposit: z.number().nonnegative('Opening deposit cannot be negative').optional().default(0),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI', 'RTGS', 'ONLINE']).optional().default('CASH'),
  interestRate: z.number().nonnegative('Interest rate cannot be negative').optional(),
  minimumBalance: z.number().nonnegative('Minimum balance cannot be negative').optional(),
});

export const savingsDepositSchema = z.object({
  accountId: objectIdSchema,
  amount: z.number().positive('Deposit amount must be greater than zero'),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI', 'RTGS', 'ONLINE']).default('CASH'),
  referenceNo: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const savingsWithdrawalSchema = z.object({
  accountId: objectIdSchema,
  amount: z.number().positive('Withdrawal amount must be greater than zero'),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI', 'RTGS', 'ONLINE']).default('CASH'),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const savingsFreezeSchema = z.object({
  accountId: objectIdSchema,
  reason: z.enum(['kyc_pending', 'court_order', 'fraud_review', 'compliance_hold', 'manual_hold']),
});

export const savingsUnfreezeSchema = z.object({
  accountId: objectIdSchema,
});

export const savingsCloseSchema = z.object({
  accountId: objectIdSchema,
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const savingsInterestPostSchema = z.object({
  branchId: objectIdSchema.optional().nullable(),
  periodStart: dateSchema,
  periodEnd: dateSchema,
});

export default {
  openSavingsAccountSchema,
  savingsDepositSchema,
  savingsWithdrawalSchema,
  savingsFreezeSchema,
  savingsUnfreezeSchema,
  savingsCloseSchema,
  savingsInterestPostSchema,
};
