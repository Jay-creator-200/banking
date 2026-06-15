import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const BankReconciliationSchema = new mongoose.Schema({
  bankAccount: {
    type: String,
    required: [true, 'Bank account identification is required'],
    trim: true,
    index: true,
  },
  statementDate: {
    type: Date,
    required: [true, 'Statement date is required'],
    index: true,
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  closingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  transactions: [
    {
      date: {
        type: Date,
        required: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
      },
      refNo: {
        type: String,
        trim: true,
      },
      debit: {
        type: Number,
        default: 0,
      },
      credit: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ['Matched', 'Unmatched', 'Pending Review'],
        default: 'Unmatched',
      },
      systemTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null,
      },
      matchedAt: {
        type: Date,
      },
      matchedBy: {
        type: String,
      },
    },
  ],
});

BankReconciliationSchema.plugin(baseSchemaPlugin);

const BankReconciliation = mongoose.models.BankReconciliation || mongoose.model('BankReconciliation', BankReconciliationSchema);

export default BankReconciliation;
export { BankReconciliation };
