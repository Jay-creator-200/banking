import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const SalaryPaymentSchema = new mongoose.Schema({
  salaryNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true,
  },
  salaryMonth: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  allowances: {
    type: Number,
    default: 0,
    min: 0,
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0,
  },
  netSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMode: {
    type: String,
    enum: ['CASH', 'BANK'],
    default: 'BANK',
    uppercase: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  remarks: {
    type: String,
    trim: true,
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    default: null,
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalVoucher',
    default: null,
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID'],
    default: 'PENDING',
    uppercase: true,
    index: true,
  },
});

SalaryPaymentSchema.plugin(baseSchemaPlugin);

const SalaryPayment = mongoose.models.SalaryPayment || mongoose.model('SalaryPayment', SalaryPaymentSchema);

export default SalaryPayment;
export { SalaryPayment };
