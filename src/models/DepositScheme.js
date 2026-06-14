import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const DepositSchemeSchema = new mongoose.Schema({
  schemeCode: {
    type: String,
    required: [true, 'Scheme code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  schemeName: {
    type: String,
    required: [true, 'Scheme name is required'],
    trim: true,
  },
  schemeType: {
    type: String,
    required: [true, 'Scheme type is required'],
    enum: ['RD', 'FD', 'DDS', 'MIS'],
    uppercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  interestType: {
    type: String,
    required: [true, 'Interest type is required'],
    enum: ['simple', 'compound'],
    lowercase: true,
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative'],
  },
  compoundingFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', null],
    lowercase: true,
    default: null,
  },
  minimumTenure: {
    type: Number,
    required: [true, 'Minimum tenure is required'],
    min: [1, 'Minimum tenure must be at least 1'],
  },
  maximumTenure: {
    type: Number,
    required: [true, 'Maximum tenure is required'],
    min: [1, 'Maximum tenure must be at least 1'],
  },
  tenureUnit: {
    type: String,
    required: [true, 'Tenure unit is required'],
    enum: ['months', 'days'],
    lowercase: true,
  },
  minimumDepositAmount: {
    type: Number,
    required: [true, 'Minimum deposit amount is required'],
    min: [1, 'Minimum deposit amount must be positive'],
  },
  maximumDepositAmount: {
    type: Number,
    required: [true, 'Maximum deposit amount is required'],
    min: [1, 'Maximum deposit amount must be positive'],
  },
  installmentFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', null],
    lowercase: true,
    default: null,
  },
  latePaymentPenaltyType: {
    type: String,
    enum: ['fixed', 'percentage', null],
    lowercase: true,
    default: null,
  },
  latePaymentPenaltyValue: {
    type: Number,
    default: 0,
    min: [0, 'Penalty value cannot be negative'],
  },
  allowedPrematureClosure: {
    type: Boolean,
    default: true,
  },
  prematurePenaltyRate: {
    type: Number,
    default: 0,
    min: [0, 'Penalty rate cannot be negative'],
  },
  autoRenewalAllowed: {
    type: Boolean,
    default: false,
  },
});

DepositSchemeSchema.plugin(baseSchemaPlugin);

const DepositScheme = mongoose.models.DepositScheme || mongoose.model('DepositScheme', DepositSchemeSchema);

export default DepositScheme;
export { DepositScheme };
