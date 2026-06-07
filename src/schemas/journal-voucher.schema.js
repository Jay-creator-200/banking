import { z } from 'zod';
import { objectIdSchema, dateSchema } from './common/index.js';

export const createVoucherSchema = z.object({
  voucherDate: dateSchema.optional(),
  voucherType: z.enum(['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA']),
  branchId: objectIdSchema,
  narration: z.string().trim().max(500).optional().nullable(),
  entries: z.array(
    z.object({
      accountHeadId: objectIdSchema,
      debit: z.number().nonnegative().default(0),
      credit: z.number().nonnegative().default(0),
      memberId: objectIdSchema.optional().nullable(),
      narration: z.string().trim().max(250).optional().nullable(),
    })
  ).min(2, 'A journal voucher must have at least two entry lines'),
}).refine((data) => {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const entry of data.entries) {
    totalDebit += entry.debit;
    totalCredit += entry.credit;
  }
  // Allow a tiny margin of floating point error
  return Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;
}, {
  message: 'Double-entry failure: Total Debits must equal Total Credits, and must be greater than zero.',
  path: ['entries'],
});

export default {
  createVoucherSchema,
};
