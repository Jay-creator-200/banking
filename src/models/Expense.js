import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const ExpenseSchema = new mongoose.Schema({
  expenseNo: {
    type: String,
    required: [true, 'Expense number is required'],
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
    required: [true, 'Expense category is required'],
    enum: ['Salary', 'Rent', 'Utilities', 'Admin', 'Interest', 'Other'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than zero'],
  },
  paymentMode: {
    type: String,
    required: [true, 'Payment mode is required'],
    enum: ['CASH', 'BANK'],
    uppercase: true,
  },
  vendor: {
    type: String,
    required: [true, 'Vendor / Payee is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  approvalStatus: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID'],
    default: 'PENDING',
    uppercase: true,
    index: true,
  },
  accountHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHead',
    required: [true, 'Debit Account Head is required'],
    index: true,
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalVoucher',
    default: null,
  },
});

ExpenseSchema.plugin(baseSchemaPlugin);

const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

export default Expense;
export { Expense };
