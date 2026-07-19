import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanSchema = new mongoose.Schema({
  loanNo: {
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
    required: [true, 'Member reference is required'],
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required'],
    index: true,
  },
  loanProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanProduct',
    required: [true, 'Loan product reference is required'],
    index: true,
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanApplication',
    required: [true, 'Application reference is required'],
    index: true,
  },
  disbursementDate: {
    type: Date,
    required: true,
  },
  principalAmount: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: 0,
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
  },
  interestType: {
    type: String,
    required: true,
    enum: ['flat', 'reducing'],
  },
  tenureMonths: {
    type: Number,
    required: true,
    min: 1,
  },
  emiAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  totalInterest: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPayable: {
    type: Number,
    required: true,
    min: 0,
  },
  outstandingPrincipal: {
    type: Number,
    default: 0,
    min: 0,
  },
  outstandingInterest: {
    type: Number,
    default: 0,
    min: 0,
  },
  overdueAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  penaltyAccrued: {
    type: Number,
    default: 0,
    min: 0,
  },
  nextDueDate: {
    type: Date,
    default: null,
    index: true,
  },
  loanStatus: {
    type: String,
    enum: ['active', 'closed', 'overdue', 'written_off', 'foreclosed'],
    default: 'active',
    index: true,
  },
  disbursementMode: {
    type: String,
    enum: ['CASH', 'TRANSFER', 'ACCOUNT_CREDIT', 'RTGS', 'ONLINE'],
    default: 'CASH',
  },
  disbursementTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  // For foreclosure
  foreclosureCharges: {
    type: Number,
    default: 0,
  },
});

LoanSchema.plugin(baseSchemaPlugin);

const existingLoanModel = mongoose.models.Loan;
const existingDisbursementModes = existingLoanModel?.schema?.path('disbursementMode')?.enumValues || [];
const hasCurrentDisbursementModeSchema = ['RTGS', 'ONLINE'].every((value) => existingDisbursementModes.includes(value));
if (existingLoanModel && !hasCurrentDisbursementModeSchema) {
  mongoose.deleteModel('Loan');
}

const Loan = mongoose.models.Loan || mongoose.model('Loan', LoanSchema);

export default Loan;
export { Loan };
