import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const BusinessDayClosingSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Business date is required'],
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required'],
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
  status: {
    type: String,
    required: true,
    enum: ['CLOSED'],
    default: 'CLOSED',
    uppercase: true,
  },
  closedBy: {
    type: String,
    required: true,
  },
  closedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Compound unique index so a branch can close a specific date only once
BusinessDayClosingSchema.index({ branchId: 1, date: 1 }, { unique: true });

BusinessDayClosingSchema.plugin(baseSchemaPlugin);

const BusinessDayClosing = mongoose.models.BusinessDayClosing || mongoose.model('BusinessDayClosing', BusinessDayClosingSchema);

export default BusinessDayClosing;
export { BusinessDayClosing };
