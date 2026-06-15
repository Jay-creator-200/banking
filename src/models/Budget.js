import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const BudgetSchema = new mongoose.Schema({
  fiscalYear: {
    type: String,
    required: [true, 'Fiscal year is required (e.g. 2026-2027)'],
    trim: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch reference is required'],
    index: true,
  },
  department: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    index: true,
  },
  accountHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHead',
    required: [true, 'Account Head is required'],
    index: true,
  },
  allocatedAmount: {
    type: Number,
    required: [true, 'Allocated amount is required'],
    min: [0, 'Allocation cannot be negative'],
  },
});

// Make it unique per year, branch, department, and account head
BudgetSchema.index({ fiscalYear: 1, branchId: 1, department: 1, accountHeadId: 1 }, { unique: true });

BudgetSchema.plugin(baseSchemaPlugin);

const Budget = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);

export default Budget;
export { Budget };
