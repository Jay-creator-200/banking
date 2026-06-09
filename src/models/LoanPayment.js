import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanPaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan reference is required'],
    index: true,
  },
  // Schedule installment this payment is primarily against (may span multiple)
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanSchedule',
    default: null,
    index: true,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  paymentMode: {
    type: String,
    required: true,
    enum: ['CASH', 'TRANSFER', 'CHEQUE', 'UPI'],
    uppercase: true,
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be positive'],
  },
  principalCollected: {
    type: Number,
    default: 0,
    min: 0,
  },
  interestCollected: {
    type: Number,
    default: 0,
    min: 0,
  },
  penaltyCollected: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Reference to the Transaction record
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
  // Reference to the Journal Voucher posted
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalVoucher',
    default: null,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    default: null,
  },
  receiptNo: {
    type: String,
    trim: true,
    uppercase: true,
    default: null,
  },
  remarks: {
    type: String,
    trim: true,
  },
});

LoanPaymentSchema.plugin(baseSchemaPlugin);

const LoanPayment = mongoose.models.LoanPayment || mongoose.model('LoanPayment', LoanPaymentSchema);

export default LoanPayment;
export { LoanPayment };
