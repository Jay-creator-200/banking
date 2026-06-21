import { z } from 'zod';

/**
 * Common Zod validation rules and utilities for reuse across different domains.
 */

// Email validation schema: enforces lowercase, trimming, and correct syntax
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address format' });

// Indian Mobile Number validation (10 digits starting with 6, 7, 8, or 9)
export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit number (e.g. 9876543210)',
  });

// Secure password validator (length >= 8, uppercase, lowercase, number, symbol)
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/\d/, { message: 'Password must contain at least one digit' })
  .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' });

// Record Status Validator
export const statusSchema = z
  .string()
  .trim()
  .uppercase()
  .default('ACTIVE');

// Date validation helper (Pre-processes strings/timestamps into Date objects)
export const dateSchema = z.preprocess((val) => {
  if (!val) return undefined;
  if (typeof val === 'string' || val instanceof Date || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return val;
}, z.date({ invalid_type_error: 'Invalid date format' }));

// Pagination parameters parser
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sort: z.string().trim().default('-createdAt'),
});

// Primary ObjectId Schema (Validates Mongoose format, pre-processing ObjectId instances into hex strings)
export const objectIdSchema = z.preprocess((val) => {
  if (val === '') return undefined;
  if (val && typeof val === 'object' && typeof val.toString === 'function') {
    return val.toString();
  }
  return val;
}, z.string().trim().regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid database identifier' }));
