import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const LoanCollateralSchema = new mongoose.Schema({
  loanApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanApplication',
    required: [true, 'Loan application reference is required'],
    index: true,
  },
  collateralType: {
    type: String,
    required: [true, 'Collateral type is required'],
    enum: ['property', 'vehicle', 'gold', 'deposit', 'other'],
    lowercase: true,
  },
  description: {
    type: String,
    required: [true, 'Collateral description is required'],
    trim: true,
    maxlength: 1000,
  },
  marketValue: {
    type: Number,
    required: [true, 'Market value is required'],
    min: 0,
  },
  documentUrl: {
    type: String,
    trim: true,
    default: null,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  remarks: {
    type: String,
    trim: true,
  },
});

LoanCollateralSchema.plugin(baseSchemaPlugin);

const LoanCollateral = mongoose.models.LoanCollateral || mongoose.model('LoanCollateral', LoanCollateralSchema);

export default LoanCollateral;
export { LoanCollateral };
