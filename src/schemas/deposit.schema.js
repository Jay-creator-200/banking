import { z } from 'zod';

export const createDepositSchemeSchema = z.object({
  schemeCode: z.string().min(1, 'Scheme code is required'),
  schemeName: z.string().min(1, 'Scheme name is required'),
  schemeType: z.enum(['RD', 'FD', 'DDS', 'MIS']),
  description: z.string().optional().nullable(),
  interestType: z.enum(['simple', 'compound']),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  compoundingFrequency: z.string().optional().nullable(), // monthly, quarterly, yearly
  minimumTenure: z.number().min(1, 'Minimum tenure must be at least 1'),
  maximumTenure: z.number().min(1, 'Maximum tenure must be at least 1'),
  tenureUnit: z.enum(['months', 'days']),
  minimumDepositAmount: z.number().min(1, 'Minimum deposit must be positive'),
  maximumDepositAmount: z.number().min(1, 'Maximum deposit must be positive'),
  installmentFrequency: z.string().optional().nullable(), // daily, weekly, monthly
  latePaymentPenaltyType: z.string().optional().nullable(), // fixed, percentage
  latePaymentPenaltyValue: z.number().min(0).optional().nullable(),
  allowedPrematureClosure: z.boolean().optional().default(true),
  prematurePenaltyRate: z.number().min(0).optional().default(0),
  autoRenewalAllowed: z.boolean().optional().default(false),
});

export const updateDepositSchemeSchema = createDepositSchemeSchema.partial();

export const openRDAccountSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  schemeId: z.string().min(1, 'Scheme ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  monthlyInstallment: z.number().min(1, 'Installment amount must be positive'),
  tenureMonths: z.number().min(1, 'Tenure in months is required'),
  startDate: z.string().optional(),
});

export const collectRDInstallmentSchema = z.object({
  rdAccountId: z.string().min(1, 'RD Account ID is required'),
  installmentNo: z.number().min(1, 'Installment number is required'),
  amount: z.number().min(0.01, 'Collection amount must be positive'),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'UPI', 'CHEQUE', 'RTGS', 'ONLINE']).default('CASH'),
});

export const openFDAccountSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  schemeId: z.string().min(1, 'Scheme ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  principalAmount: z.number().min(1, 'Principal amount must be positive'),
  tenureMonths: z.number().min(1, 'Tenure in months is required'),
  paymentMode: z.enum(['monthly', 'quarterly', 'maturity']).default('maturity'),
  startDate: z.string().optional(),
});

export const openDDSAccountSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  schemeId: z.string().min(1, 'Scheme ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  dailyAmount: z.number().min(1, 'Daily amount must be positive'),
  durationDays: z.number().min(1, 'Duration in days is required'),
  startDate: z.string().optional(),
});

export const collectDDSAmountSchema = z.object({
  ddsAccountId: z.string().min(1, 'DDS Account ID is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'UPI', 'CHEQUE', 'RTGS', 'ONLINE']).default('CASH'),
});

export const openMISAccountSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  schemeId: z.string().min(1, 'Scheme ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  principalAmount: z.number().min(1, 'Principal amount must be positive'),
  tenureMonths: z.number().min(1, 'Tenure in months is required'),
  startDate: z.string().optional(),
});

export const depositPrematureClosureSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  accountType: z.enum(['RD', 'FD', 'DDS', 'MIS']),
  remarks: z.string().min(1, 'Remarks/Reason is required'),
});
