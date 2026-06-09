import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanScheduleSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan reference is required'],
    index: true,
  },
  installmentNo: {
    type: Number,
    required: true,
    min: 1,
  },
  dueDate: {
    type: Date,
    required: true,
    index: true,
  },
  openingPrincipal: {
    type: Number,
    required: true,
    min: 0,
  },
  principalDue: {
    type: Number,
    required: true,
    min: 0,
  },
  interestDue: {
    type: Number,
    required: true,
    min: 0,
  },
  penaltyDue: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalDue: {
    type: Number,
    required: true,
    min: 0,
  },
  closingPrincipal: {
    type: Number,
    required: true,
    min: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  principalPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  interestPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  penaltyPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  paidDate: {
    type: Date,
    default: null,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending',
    index: true,
  },
  daysOverdue: {
    type: Number,
    default: 0,
  },
});

LoanScheduleSchema.plugin(baseSchemaPlugin);

const LoanSchedule = mongoose.models.LoanSchedule || mongoose.model('LoanSchedule', LoanScheduleSchema);

export default LoanSchedule;
export { LoanSchedule };
