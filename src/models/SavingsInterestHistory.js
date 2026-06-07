import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const SavingsInterestHistorySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavingsAccount',
    required: [true, 'Savings account association is required'],
    index: true,
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
  },
  interestAmount: {
    type: Number,
    required: [true, 'Interest amount is required'],
  },
  postingDate: {
    type: Date,
    required: [true, 'Posting date is required'],
    default: Date.now,
    index: true,
  },
  periodStart: {
    type: Date,
    required: [true, 'Period start date is required'],
  },
  periodEnd: {
    type: Date,
    required: [true, 'Period end date is required'],
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by user is required'],
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalVoucher',
  },
});

SavingsInterestHistorySchema.plugin(baseSchemaPlugin);

const SavingsInterestHistory = mongoose.models.SavingsInterestHistory || mongoose.model('SavingsInterestHistory', SavingsInterestHistorySchema);

export default SavingsInterestHistory;
export { SavingsInterestHistory };
