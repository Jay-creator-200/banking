import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanWriteoffSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan reference is required'],
    index: true,
    unique: true,
  },
  outstandingAmount: {
    type: Number,
    required: [true, 'Outstanding amount is required'],
    min: 0,
  },
  principalOutstanding: {
    type: Number,
    default: 0,
    min: 0,
  },
  interestOutstanding: {
    type: Number,
    default: 0,
    min: 0,
  },
  penaltyOutstanding: {
    type: Number,
    default: 0,
    min: 0,
  },
  writeoffReason: {
    type: String,
    required: [true, 'Write-off reason is required'],
    trim: true,
    maxlength: 1000,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  writeoffDate: {
    type: Date,
    default: null,
  },
  remarks: {
    type: String,
    trim: true,
  },
  writeoffStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  // Approval workflow reference
  approvalRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalRequest',
    default: null,
  },
  // Journal voucher for write-off accounting entry
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalVoucher',
    default: null,
  },
});

LoanWriteoffSchema.plugin(baseSchemaPlugin);

const LoanWriteoff = mongoose.models.LoanWriteoff || mongoose.model('LoanWriteoff', LoanWriteoffSchema);

export default LoanWriteoff;
export { LoanWriteoff };
