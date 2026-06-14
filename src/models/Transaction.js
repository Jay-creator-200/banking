import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const TransactionSchema = new mongoose.Schema({
  transactionNo: {
    type: String,
    required: [true, 'Transaction number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    index: true,
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['savings', 'loan', 'scheme', 'share', 'membership', 'interest', 'general'],
    trim: true,
    lowercase: true,
  },
  accountId: {
    type: String,
    trim: true,
    index: true,
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: [
      'SAVINGS_DEPOSIT',
      'SAVINGS_WITHDRAWAL',
      'LOAN_DISBURSEMENT',
      'LOAN_INSTALLMENT',
      'MEMBERSHIP_FEE',
      'SHARE_PURCHASE',
      'INTEREST_CREDIT',
      'RD_DEPOSIT',
      'RD_DEPOSIT_TRANSFER',
      'RD_WITHDRAWAL',
      'RD_WITHDRAWAL_TRANSFER',
      'RD_INTEREST',
      'FD_DEPOSIT',
      'FD_DEPOSIT_TRANSFER',
      'FD_WITHDRAWAL',
      'FD_WITHDRAWAL_TRANSFER',
      'FD_INTEREST',
      'DDS_DEPOSIT',
      'DDS_DEPOSIT_TRANSFER',
      'DDS_WITHDRAWAL',
      'DDS_WITHDRAWAL_TRANSFER',
      'DDS_INTEREST',
      'MIS_DEPOSIT',
      'MIS_DEPOSIT_TRANSFER',
      'MIS_WITHDRAWAL',
      'MIS_WITHDRAWAL_TRANSFER',
      'MIS_PAYOUT',
      'MIS_PAYOUT_TRANSFER',
    ],
    trim: true,
    uppercase: true,
  },
  paymentMode: {
    type: String,
    required: [true, 'Payment mode is required'],
    enum: ['CASH', 'TRANSFER', 'CHEQUE', 'UPI'],
    trim: true,
    uppercase: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  balanceAfter: {
    type: Number,
  },
  referenceNo: {
    type: String,
    trim: true,
  },
  narration: {
    type: String,
    trim: true,
  },
  sourceCollection: {
    type: String,
    trim: true,
  },
  sourceId: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'POSTED', 'CANCELLED', 'REVERSED'],
    default: 'PENDING',
    uppercase: true,
    index: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  approvedAt: {
    type: Date,
  },
  // Link to the teller's active cash session (required for CASH payment mode transactions)
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    default: null,
    index: true,
  },
});

TransactionSchema.plugin(baseSchemaPlugin);

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export default Transaction;
export { Transaction };
