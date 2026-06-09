import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanGuarantorSchema = new mongoose.Schema({
  loanApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanApplication',
    required: [true, 'Loan application reference is required'],
    index: true,
  },
  // Optional: if guarantor is also a member
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Guarantor name is required'],
    trim: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  relationship: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  guaranteedAmount: {
    type: Number,
    required: [true, 'Guaranteed amount is required'],
    min: 0,
  },
  guarantorStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  remarks: {
    type: String,
    trim: true,
  },
});

LoanGuarantorSchema.plugin(baseSchemaPlugin);

const LoanGuarantor = mongoose.models.LoanGuarantor || mongoose.model('LoanGuarantor', LoanGuarantorSchema);

export default LoanGuarantor;
export { LoanGuarantor };
