import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const MemberNomineeSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    index: true,
  },
  fullName: {
    type: String,
    required: [true, 'Nominee full name is required'],
    trim: true,
  },
  relationship: {
    type: String,
    required: [true, 'Relationship is required'],
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  mobile: {
    type: String,
    trim: true,
  },
  aadhaarNumber: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  sharePercentage: {
    type: Number,
    required: [true, 'Share percentage is required'],
    min: [0, 'Share percentage cannot be negative'],
    max: [100, 'Share percentage cannot exceed 100'],
  },
  isPrimary: {
    type: Boolean,
    required: true,
    default: false,
  },
});

MemberNomineeSchema.plugin(baseSchemaPlugin);

const MemberNominee = mongoose.models.MemberNominee || mongoose.model('MemberNominee', MemberNomineeSchema);

export default MemberNominee;
export { MemberNominee };
