import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanApplicationSchema = new mongoose.Schema({
  applicationNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member is required'],
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch is required'],
    index: true,
  },
  loanProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanProduct',
    required: [true, 'Loan product is required'],
    index: true,
  },
  requestedAmount: {
    type: Number,
    required: [true, 'Requested amount is required'],
    min: [1, 'Requested amount must be positive'],
  },
  requestedTenureMonths: {
    type: Number,
    required: [true, 'Requested tenure is required'],
    min: 1,
  },
  purpose: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  applicationDate: {
    type: Date,
    default: Date.now,
  },
  applicationStatus: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
    default: 'draft',
    index: true,
  },
  approvedAmount: {
    type: Number,
    default: null,
  },
  approvedTenure: {
    type: Number,
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null,
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  // Approval request reference
  approvalRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalRequest',
    default: null,
  },
  // Processing fee charged
  processingFee: {
    type: Number,
    default: 0,
  },
});

LoanApplicationSchema.plugin(baseSchemaPlugin);

const LoanApplication = mongoose.models.LoanApplication || mongoose.model('LoanApplication', LoanApplicationSchema);

export default LoanApplication;
export { LoanApplication };
