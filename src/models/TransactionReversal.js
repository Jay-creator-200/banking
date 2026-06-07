import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const TransactionReversalSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'Original transaction reference is required'],
    index: true,
  },
  reversalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    index: true,
  },
  reason: {
    type: String,
    required: [true, 'Reversal reason is required'],
    trim: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requesting user reference is required'],
    index: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  approvedAt: {
    type: Date,
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    uppercase: true,
    index: true,
  },
  remarks: {
    type: String,
    trim: true,
  },
});

TransactionReversalSchema.plugin(baseSchemaPlugin);

const TransactionReversal = mongoose.models.TransactionReversal || mongoose.model('TransactionReversal', TransactionReversalSchema);

export default TransactionReversal;
export { TransactionReversal };
