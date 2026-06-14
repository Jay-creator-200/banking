import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const DDSAccountSchema = new mongoose.Schema({
  ddsAccountNo: {
    type: String,
    required: [true, 'DDS Account number is required'],
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
  dailyAmount: {
    type: Number,
    required: [true, 'Daily amount is required'],
    min: [1, 'Daily amount must be positive'],
  },
  durationDays: {
    type: Number,
    required: [true, 'Duration in days is required'],
    min: [1, 'Duration must be at least 1 day'],
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
  totalDeposit: {
    type: Number,
    default: 0,
    min: [0, 'Total deposit cannot be negative'],
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
  status: {
    type: String,
    required: true,
    enum: ['active', 'matured', 'closed', 'premature_closed'],
    default: 'active',
    lowercase: true,
    index: true,
  },
});

DDSAccountSchema.plugin(baseSchemaPlugin);

const DDSAccount = mongoose.models.DDSAccount || mongoose.model('DDSAccount', DDSAccountSchema);

export default DDSAccount;
export { DDSAccount };
