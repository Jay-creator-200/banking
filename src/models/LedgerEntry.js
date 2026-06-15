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
    debitAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Debit amount cannot be negative'],
    },
    creditAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Credit amount cannot be negative'],
    },
    balanceAfterTransaction: {
      type: Number,
      required: true,
      default: 0,
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
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

// Middleware to maintain bidirectional compatibility
LedgerEntrySchema.pre('save', function (next) {
  if (this.debit && !this.debitAmount) {
    this.debitAmount = this.debit;
  } else if (this.debitAmount && !this.debit) {
    this.debit = this.debitAmount;
  }

  if (this.credit && !this.creditAmount) {
    this.creditAmount = this.credit;
  } else if (this.creditAmount && !this.credit) {
    this.credit = this.creditAmount;
  }

  if (this.entryDate && !this.transactionDate) {
    this.transactionDate = this.entryDate;
  } else if (this.transactionDate && !this.entryDate) {
    this.entryDate = this.transactionDate;
  }

  next();
});

const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', LedgerEntrySchema);

export default LedgerEntry;
export { LedgerEntry };
