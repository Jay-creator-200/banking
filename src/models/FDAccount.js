import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const FDAccountSchema = new mongoose.Schema({
  fdAccountNo: {
    type: String,
    required: [true, 'FD Account number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    index: true,
  },
  schemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DepositScheme',
    required: [true, 'Deposit scheme association is required'],
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  principalAmount: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: [1, 'Principal amount must be positive'],
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative'],
  },
  tenureMonths: {
    type: Number,
    required: [true, 'Tenure in months is required'],
    min: [1, 'Tenure must be at least 1 month'],
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now,
  },
  maturityDate: {
    type: Date,
    required: [true, 'Maturity date is required'],
  },
  interestAmount: {
    type: Number,
    required: [true, 'Interest amount is required'],
    min: [0, 'Interest amount cannot be negative'],
  },
  maturityAmount: {
    type: Number,
    required: [true, 'Maturity amount is required'],
    min: [0, 'Maturity amount cannot be negative'],
  },
  paymentMode: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'maturity'],
    lowercase: true,
    default: 'maturity',
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'matured', 'closed', 'premature_closed'],
    default: 'active',
    lowercase: true,
    index: true,
  },
});

FDAccountSchema.plugin(baseSchemaPlugin);

const FDAccount = mongoose.models.FDAccount || mongoose.model('FDAccount', FDAccountSchema);

export default FDAccount;
export { FDAccount };
