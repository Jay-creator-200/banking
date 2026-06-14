import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const MISAccountSchema = new mongoose.Schema({
  misAccountNo: {
    type: String,
    required: [true, 'MIS Account number is required'],
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
  monthlyInterestAmount: {
    type: Number,
    required: [true, 'Monthly interest payout amount is required'],
    min: [0, 'Monthly interest payout must be non-negative'],
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
  nextPayoutDate: {
    type: Date,
    required: [true, 'Next payout date is required'],
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

MISAccountSchema.plugin(baseSchemaPlugin);

const MISAccount = mongoose.models.MISAccount || mongoose.model('MISAccount', MISAccountSchema);

export default MISAccount;
export { MISAccount };
