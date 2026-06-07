import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const SavingsAccountSchema = new mongoose.Schema({
  accountNo: {
    type: String,
    required: [true, 'Account number is required'],
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
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  openingDate: {
    type: Date,
    required: [true, 'Opening date is required'],
    default: Date.now,
    index: true,
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['regular', 'staff', 'senior_citizen'],
    lowercase: true,
    trim: true,
  },
  minimumBalance: {
    type: Number,
    required: [true, 'Minimum balance is required'],
    default: 1000,
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    default: 4.0,
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  availableBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'frozen', 'dormant', 'closed'],
    default: 'active',
    lowercase: true,
    trim: true,
    index: true,
  },
  freezeReason: {
    type: String,
    enum: ['kyc_pending', 'court_order', 'fraud_review', 'compliance_hold', 'manual_hold', null],
    default: null,
    trim: true,
  },
  closedAt: {
    type: Date,
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

SavingsAccountSchema.plugin(baseSchemaPlugin);

const SavingsAccount = mongoose.models.SavingsAccount || mongoose.model('SavingsAccount', SavingsAccountSchema);

export default SavingsAccount;
export { SavingsAccount };
