import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const ShareLedgerSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    index: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    index: true,
  },
  certificateNo: {
    type: String,
    required: [true, 'Certificate number is required'],
    trim: true,
    index: true,
  },
  sharesPurchased: {
    type: Number,
    required: [true, 'Shares purchased amount is required'],
    min: [1, 'Must purchase at least 1 share'],
  },
  shareValue: {
    type: Number,
    required: true,
    default: 10,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'cancelled'],
    default: 'active',
    lowercase: true,
    trim: true,
    index: true,
  },
});

ShareLedgerSchema.plugin(baseSchemaPlugin);

const ShareLedger = mongoose.models.ShareLedger || mongoose.model('ShareLedger', ShareLedgerSchema);

export default ShareLedger;
export { ShareLedger };
