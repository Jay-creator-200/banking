import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const RDAccountSchema = new mongoose.Schema({
  rdAccountNo: {
    type: String,
    required: [true, 'RD Account number is required'],
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
  monthlyInstallment: {
    type: Number,
    required: [true, 'Monthly installment amount is required'],
    min: [1, 'Monthly installment must be positive'],
  },
  tenureMonths: {
    type: Number,
    required: [true, 'Tenure in months is required'],
    min: [1, 'Tenure must be at least 1 month'],
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative'],
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
  totalDepositAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total deposit amount cannot be negative'],
  },
  totalInterest: {
    type: Number,
    default: 0,
    min: [0, 'Total interest cannot be negative'],
  },
  maturityAmount: {
    type: Number,
    required: [true, 'Maturity amount is required'],
    min: [0, 'Maturity amount cannot be negative'],
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'matured', 'closed', 'premature_closed'],
    default: 'active',
    lowercase: true,
    index: true,
  },
  nextInstallmentDate: {
    type: Date,
    required: [true, 'Next installment date is required'],
  },
});

RDAccountSchema.plugin(baseSchemaPlugin);

const RDAccount = mongoose.models.RDAccount || mongoose.model('RDAccount', RDAccountSchema);

export default RDAccount;
export { RDAccount };
