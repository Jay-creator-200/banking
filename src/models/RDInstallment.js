import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const RDInstallmentSchema = new mongoose.Schema({
  rdAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RDAccount',
    required: [true, 'RD Account reference is required'],
    index: true,
  },
  installmentNo: {
    type: Number,
    required: [true, 'Installment number is required'],
    min: [1, 'Installment number must be at least 1'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive'],
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative'],
  },
  paidDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'late'],
    default: 'pending',
    lowercase: true,
    index: true,
  },
});

RDInstallmentSchema.plugin(baseSchemaPlugin);

const RDInstallment = mongoose.models.RDInstallment || mongoose.model('RDInstallment', RDInstallmentSchema);

export default RDInstallment;
export { RDInstallment };
