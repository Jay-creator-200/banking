import { z } from 'zod';
import { objectIdSchema, paginationSchema } from './common/index.js';

// ─── Loan Product ────────────────────────────────────────────────────────────

export const createLoanProductSchema = z.object({
  productCode: z.string().trim().min(2).max(20).toUpperCase(),
  productName: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  interestType: z.enum(['flat', 'reducing']),
  interestRate: z.number().min(0).max(100),
  penaltyRate: z.number().min(0).max(100).optional().default(0),
  penaltyType: z.enum(['daily_percentage', 'monthly_percentage', 'fixed', 'none']).optional().default('daily_percentage'),
  processingFeeType: z.enum(['fixed', 'percentage']).optional().default('percentage'),
  processingFeeValue: z.number().min(0).optional().default(0),
  minimumAmount: z.number().positive(),
  maximumAmount: z.number().positive(),
  minimumTenure: z.number().int().positive(),
  maximumTenure: z.number().int().positive(),
  requiresGuarantor: z.boolean().optional().default(false),
  requiresCollateral: z.boolean().optional().default(false),
  approvalLevels: z.number().int().min(1).max(3).optional().default(1),
});

export const updateLoanProductSchema = createLoanProductSchema.partial();

// ─── Loan Application ────────────────────────────────────────────────────────

export const createLoanApplicationSchema = z.object({
  memberId: objectIdSchema,
  branchId: objectIdSchema,
  loanProductId: objectIdSchema,
  requestedAmount: z.number().positive('Requested amount must be positive'),
  requestedTenureMonths: z.number().int().positive('Tenure must be a positive integer'),
  purpose: z.string().trim().max(1000).optional().nullable(),
  remarks: z.string().trim().max(1000).optional().nullable(),
});

export const updateLoanApplicationSchema = z.object({
  requestedAmount: z.number().positive().optional(),
  requestedTenureMonths: z.number().int().positive().optional(),
  purpose: z.string().trim().max(1000).optional().nullable(),
  remarks: z.string().trim().max(1000).optional().nullable(),
});

export const approveApplicationSchema = z.object({
  applicationId: objectIdSchema,
  approvedAmount: z.number().positive('Approved amount must be positive'),
  approvedTenure: z.number().int().positive('Approved tenure must be positive'),
  remarks: z.string().trim().max(1000).optional().nullable(),
});

export const rejectApplicationSchema = z.object({
  applicationId: objectIdSchema,
  rejectionReason: z.string().trim().min(5, 'Rejection reason is required').max(1000),
});

export const searchApplicationSchema = paginationSchema.extend({
  memberId: z.string().optional(),
  branchId: z.string().optional(),
  loanProductId: z.string().optional(),
  applicationStatus: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ─── Guarantor ───────────────────────────────────────────────────────────────

export const addGuarantorSchema = z.object({
  loanApplicationId: objectIdSchema,
  memberId: objectIdSchema.optional().nullable(),
  name: z.string().trim().min(2).max(200),
  mobile: z.string().trim().max(15).optional().nullable(),
  relationship: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  guaranteedAmount: z.number().min(0),
});

// ─── Collateral ──────────────────────────────────────────────────────────────

export const addCollateralSchema = z.object({
  loanApplicationId: objectIdSchema,
  collateralType: z.enum(['property', 'vehicle', 'gold', 'deposit', 'other']),
  description: z.string().trim().min(2).max(1000),
  marketValue: z.number().positive(),
  documentUrl: z.string().trim().max(500).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

// ─── Disbursement ────────────────────────────────────────────────────────────

export const disburseLoanSchema = z.object({
  applicationId: objectIdSchema,
  disbursementDate: z.string().optional().nullable(),
  disbursementMode: z.enum(['CASH', 'TRANSFER', 'ACCOUNT_CREDIT']),
  sessionId: objectIdSchema.optional().nullable(), // Required for CASH mode
  remarks: z.string().trim().max(500).optional().nullable(),
});

// ─── Payment ─────────────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  loanId: objectIdSchema,
  amount: z.number().positive('Payment amount must be positive'),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI']),
  paymentDate: z.string().optional().nullable(),
  sessionId: objectIdSchema.optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

// ─── Foreclosure ─────────────────────────────────────────────────────────────

export const foreclosureSchema = z.object({
  loanId: objectIdSchema,
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE', 'UPI']),
  sessionId: objectIdSchema.optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

// ─── Write-off ───────────────────────────────────────────────────────────────

export const writeoffSchema = z.object({
  loanId: objectIdSchema,
  writeoffReason: z.string().trim().min(5).max(1000),
  remarks: z.string().trim().max(500).optional().nullable(),
});

// ─── Search / Reports ────────────────────────────────────────────────────────

export const searchLoanSchema = paginationSchema.extend({
  memberId: z.string().optional(),
  branchId: z.string().optional(),
  loanProductId: z.string().optional(),
  loanStatus: z.enum(['active', 'closed', 'overdue', 'written_off', 'foreclosed']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export default {
  createLoanProductSchema,
  updateLoanProductSchema,
  createLoanApplicationSchema,
  updateLoanApplicationSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  addGuarantorSchema,
  addCollateralSchema,
  disburseLoanSchema,
  recordPaymentSchema,
  foreclosureSchema,
  writeoffSchema,
  searchLoanSchema,
  searchApplicationSchema,
};
