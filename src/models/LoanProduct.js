import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanProductSchema = new mongoose.Schema({
  productCode: {
    type: String,
    required: [true, 'Product code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  interestType: {
    type: String,
    required: true,
    enum: ['flat', 'reducing'],
    lowercase: true,
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative'],
  },
  penaltyRate: {
    type: Number,
    default: 0,
    min: [0, 'Penalty rate cannot be negative'],
  },
  penaltyType: {
    type: String,
    enum: ['daily_percentage', 'monthly_percentage', 'fixed', 'none'],
    default: 'daily_percentage',
  },
  processingFeeType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'percentage',
  },
  processingFeeValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  minimumAmount: {
    type: Number,
    required: [true, 'Minimum loan amount is required'],
    min: 0,
  },
  maximumAmount: {
    type: Number,
    required: [true, 'Maximum loan amount is required'],
    min: 0,
  },
  minimumTenure: {
    type: Number,
    required: [true, 'Minimum tenure (months) is required'],
    min: 1,
  },
  maximumTenure: {
    type: Number,
    required: [true, 'Maximum tenure (months) is required'],
    min: 1,
  },
  requiresGuarantor: {
    type: Boolean,
    default: false,
  },
  requiresCollateral: {
    type: Boolean,
    default: false,
  },
  approvalLevels: {
    type: Number,
    default: 1,
    min: 1,
    max: 3,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
});

LoanProductSchema.plugin(baseSchemaPlugin);

const LoanProduct = mongoose.models.LoanProduct || mongoose.model('LoanProduct', LoanProductSchema);

export default LoanProduct;
export { LoanProduct };
