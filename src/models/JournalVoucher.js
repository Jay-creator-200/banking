import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const JournalVoucherSchema = new mongoose.Schema({
  voucherNo: {
    type: String,
    required: [true, 'Voucher number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  voucherDate: {
    type: Date,
    required: [true, 'Voucher date is required'],
    default: Date.now,
    index: true,
  },
  voucherType: {
    type: String,
    required: [true, 'Voucher type is required'],
    enum: ['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA'],
    uppercase: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  narration: {
    type: String,
    trim: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
});

JournalVoucherSchema.plugin(baseSchemaPlugin);

const JournalVoucher = mongoose.models.JournalVoucher || mongoose.model('JournalVoucher', JournalVoucherSchema);

export default JournalVoucher;
export { JournalVoucher };
