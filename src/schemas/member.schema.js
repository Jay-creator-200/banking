import { z } from 'zod';
import { objectIdSchema, emailSchema, mobileSchema, dateSchema } from './common/index.js';

// PAN Number format validator
export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}\d{4}[A-Z]$/, { message: 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter' });

// Aadhaar Number format validator
export const aadhaarSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, { message: 'Aadhaar must be exactly 12 digits' });

export const createMemberSchema = z.object({
  branchId: objectIdSchema,
  membershipDate: dateSchema.optional(),
  fullName: z.string().trim().min(3, 'Full name must be at least 3 characters'),
  fatherName: z.string().trim().min(3, 'Father name must be at least 3 characters'),
  motherName: z.string().trim().min(3, 'Mother name must be at least 3 characters'),
  spouseName: z.string().trim().optional().nullable(),
  dateOfBirth: dateSchema.refine((val) => {
    const minAgeDate = new Date();
    minAgeDate.setFullYear(minAgeDate.getFullYear() - 18);
    return val <= minAgeDate;
  }, { message: 'Member must be at least 18 years old' }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  mobile: mobileSchema,
  alternateMobile: z.string().trim().optional().nullable(),
  email: emailSchema.optional().nullable(),
  occupation: z.string().trim().optional().nullable(),
  annualIncome: z.number().nonnegative().optional().nullable(),
  aadhaarNumber: aadhaarSchema,
  panNumber: panSchema.optional().nullable(),
  addressLine1: z.string().trim().min(5, 'Address line 1 must be at least 5 characters'),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  district: z.string().trim().min(2, 'District is required'),
  pincode: z.string().trim().regex(/^\d{6}$/, { message: 'Pincode must be exactly 6 digits' }),
  memberCategory: z.enum(['general', 'senior_citizen', 'staff', 'farmer', 'business']).default('general'),
  photoUrl: z.string().trim().optional().nullable(),
  signatureUrl: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
});

export const updateMemberSchema = createMemberSchema.partial().omit({ branchId: true });

export const saveNomineesSchema = z.array(
  z.object({
    fullName: z.string().trim().min(3, 'Nominee name must be at least 3 characters'),
    relationship: z.string().trim().min(2, 'Relationship is required'),
    dateOfBirth: dateSchema,
    mobile: z.string().trim().optional().nullable(),
    aadhaarNumber: z.string().trim().optional().nullable(),
    address: z.string().trim().optional().nullable(),
    sharePercentage: z.number().min(0).max(100),
    isPrimary: z.boolean().default(false),
  })
).refine((nominees) => {
  if (nominees.length === 0) return true; // Nominees can be saved as empty if not submitted yet, but when checking active nominees:
  const hasPrimary = nominees.some((n) => n.isPrimary);
  const totalPercentage = nominees.reduce((sum, n) => sum + n.sharePercentage, 0);
  
  // Enforce total share percentage does not exceed 100%
  if (totalPercentage > 100) return false;
  return true;
}, {
  message: 'Nominees total share percentage cannot exceed 100%.',
});

export const uploadDocumentSchema = z.object({
  memberId: objectIdSchema,
  documentType: z.enum(['aadhaar', 'pan', 'photo', 'signature', 'address_proof', 'other']),
  documentName: z.string().trim().min(3, 'Document display name is required'),
  cloudinaryUrl: z.string().trim().url('Invalid file link URL'),
});

export const purchaseSharesSchema = z.object({
  memberId: objectIdSchema,
  sharesPurchased: z.number().int().positive('Must purchase at least 1 share'),
  shareValue: z.number().positive().default(10),
  paymentMode: z.enum(['CASH', 'TRANSFER', 'CHEQUE']).default('CASH'),
});

export default {
  createMemberSchema,
  updateMemberSchema,
  saveNomineesSchema,
  uploadDocumentSchema,
  purchaseSharesSchema,
};
