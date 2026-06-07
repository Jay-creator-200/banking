import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const CashTransferSchema = new mongoose.Schema({
  transferNo: {
    type: String,
    required: [true, 'Transfer number is required'],
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
  fromSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    required: [true, 'Source session is required'],
    index: true,
  },
  toSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    default: null,
    index: true,
  },
  transferType: {
    type: String,
    required: true,
    enum: ['teller_to_teller', 'teller_to_vault', 'vault_to_teller'],
    lowercase: true,
    trim: true,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Transfer amount is required'],
    min: [1, 'Transfer amount must be at least 1'],
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending',
    lowercase: true,
    trim: true,
    index: true,
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
  remarks: {
    type: String,
    trim: true,
  },
});

CashTransferSchema.plugin(baseSchemaPlugin);

const CashTransfer = mongoose.models.CashTransfer || mongoose.model('CashTransfer', CashTransferSchema);

export default CashTransfer;
export { CashTransfer };
