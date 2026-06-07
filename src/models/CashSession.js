import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const CashSessionSchema = new mongoose.Schema({
  sessionNo: {
    type: String,
    required: [true, 'Session number is required'],
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User association is required'],
    index: true,
  },
  sessionDate: {
    type: Date,
    required: [true, 'Session date is required'],
    index: true,
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  systemBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  physicalBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  closingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  differenceAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'closed'],
    default: 'open',
    lowercase: true,
    trim: true,
    index: true,
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  closedAt: {
    type: Date,
  },
  remarks: {
    type: String,
    trim: true,
  },
});

CashSessionSchema.plugin(baseSchemaPlugin);

const CashSession = mongoose.models.CashSession || mongoose.model('CashSession', CashSessionSchema);

export default CashSession;
export { CashSession };
