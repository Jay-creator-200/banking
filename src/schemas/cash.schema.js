import { z } from 'zod';
import { objectIdSchema, paginationSchema } from './common/index.js';

// --- CashSession Schemas ---

export const openSessionSchema = z.object({
  branchId: objectIdSchema,
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
  sessionDate: z.string().trim().optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
  // Optional opening denomination breakdown
  denominations: z
    .array(
      z.object({
        denomination: z.number().positive('Denomination value must be positive'),
        count: z.number().int().min(0, 'Count cannot be negative'),
      })
    )
    .optional(),
});

export const closeSessionSchema = z.object({
  sessionId: objectIdSchema,
  physicalBalance: z.number().min(0, 'Physical balance cannot be negative'),
  remarks: z.string().trim().max(500).optional().nullable(),
  // Optional closing denomination breakdown
  denominations: z
    .array(
      z.object({
        denomination: z.number().positive('Denomination value must be positive'),
        count: z.number().int().min(0, 'Count cannot be negative'),
      })
    )
    .optional(),
});

export const searchSessionSchema = paginationSchema.extend({
  branchId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  status: z.enum(['open', 'closed']).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

// --- CashTransfer Schemas ---

export const createTransferSchema = z.object({
  branchId: objectIdSchema,
  fromSessionId: objectIdSchema,
  toSessionId: objectIdSchema.optional().nullable(),
  transferType: z.enum(['teller_to_teller', 'teller_to_vault', 'vault_to_teller']),
  amount: z.number().positive('Transfer amount must be positive'),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const approveTransferSchema = z.object({
  transferId: objectIdSchema,
  action: z.enum(['approve', 'reject']),
  remarks: z.string().trim().max(500).optional().nullable(),
});

// --- VaultTransaction Schemas ---

export const createVaultTransactionSchema = z.object({
  branchId: objectIdSchema,
  transactionType: z.enum(['VAULT_IN', 'VAULT_OUT']),
  amount: z.number().positive('Amount must be positive'),
  narration: z.string().trim().max(500).optional().nullable(),
});

export const searchVaultSchema = paginationSchema.extend({
  branchId: z.string().trim().optional(),
  transactionType: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export default {
  openSessionSchema,
  closeSessionSchema,
  searchSessionSchema,
  createTransferSchema,
  approveTransferSchema,
  createVaultTransactionSchema,
  searchVaultSchema,
};
