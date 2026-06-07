import mongoose from 'mongoose';

const LedgerEntrySchema = new mongoose.Schema(
  {
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalVoucher',
      required: [true, 'Journal Voucher reference is required'],
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    accountHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccountHead',
      required: [true, 'Account Head reference is required'],
      index: true,
    },
    entryDate: {
      type: Date,
      required: [true, 'Entry date is required'],
      default: Date.now,
      index: true,
    },
    debit: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Debit amount cannot be negative'],
    },
    credit: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Credit amount cannot be negative'],
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      index: true,
    },
    narration: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
      default: 'SYSTEM',
    },
  },
  {
    timestamps: true,
  }
);

const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', LedgerEntrySchema);

export default LedgerEntry;
export { LedgerEntry };
