import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const BranchSchema = new mongoose.Schema({
  branchCode: {
    type: String,
    required: [true, 'Branch code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  branchName: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  pincode: {
    type: String,
    trim: true,
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
});

BranchSchema.plugin(baseSchemaPlugin);

const Branch = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);

export default Branch;
export { Branch };
