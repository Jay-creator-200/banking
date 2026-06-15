import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const IncomeEntrySchema = new mongoose.Schema({
  incomeNo: {
    type: String,
    required: [true, 'Income number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required'],
    index: true,
  },
  category: {
    type: String,
    required: [true, 'Income category is required'],
    enum: ['Service Charges', 'Fees', 'Other Income'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Income amount is required'],
    min: [0.01, 'Amount must be greater than zero'],
  },
  paymentMode: {
    type: String,
    required: [true, 'Payment mode is required'],
    enum: ['CASH', 'BANK'],
    uppercase: true,
  },
  receivedFrom: {
    type: String,
    required: [true, 'Received from payer is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  accountHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHead',
    required: [true, 'Credit Account Head is required'],
    index: true,
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalVoucher',
    default: null,
  },
});

IncomeEntrySchema.plugin(baseSchemaPlugin);

const IncomeEntry = mongoose.models.IncomeEntry || mongoose.model('IncomeEntry', IncomeEntrySchema);

export default IncomeEntry;
export { IncomeEntry };
