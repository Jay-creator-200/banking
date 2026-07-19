import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const MemberSchema = new mongoose.Schema({
  memberNo: {
    type: String,
    required: [true, 'Member number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  membershipDate: {
    type: Date,
    required: [true, 'Membership date is required'],
    default: Date.now,
    index: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  fatherName: {
    type: String,
    required: [true, 'Father name is required'],
    trim: true,
  },
  motherName: {
    type: String,
    required: [true, 'Mother name is required'],
    trim: true,
  },
  spouseName: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['MALE', 'FEMALE', 'OTHER'],
    uppercase: true,
    trim: true,
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    index: true,
  },
  alternateMobile: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  occupation: {
    type: String,
    trim: true,
  },
  annualIncome: {
    type: Number,
  },
  aadhaarNumber: {
    type: String,
    required: [true, 'Aadhaar number is required'],
    unique: true,
    trim: true,
    index: true,
  },
  panNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  addressLine1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    trim: true,
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
  },
  memberCategory: {
    type: String,
    required: true,
    enum: ['general', 'obc', 'sc', 'st'],
    default: 'general',
    lowercase: true,
    trim: true,
  },
  otherBankName: {
    type: String,
    trim: true,
  },
  otherBankBranch: {
    type: String,
    trim: true,
  },
  otherBankAccountNumber: {
    type: String,
    trim: true,
  },
  otherBankIfscCode: {
    type: String,
    uppercase: true,
    trim: true,
  },
  upiId: {
    type: String,
    lowercase: true,
    trim: true,
  },
  kycStatus: {
    type: String,
    required: true,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    lowercase: true,
    trim: true,
    index: true,
  },
  memberStatus: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'closed', 'deceased'],
    default: 'active',
    lowercase: true,
    trim: true,
    index: true,
  },
  photoUrl: {
    type: String,
    trim: true,
  },
  signatureUrl: {
    type: String,
    trim: true,
  },
  remarks: {
    type: String,
    trim: true,
  },
});

MemberSchema.plugin(baseSchemaPlugin);

const existingMemberModel = mongoose.models.Member;
const existingCategoryValues = existingMemberModel?.schema?.path('memberCategory')?.enumValues || [];
const hasCurrentCategorySchema = ['general', 'obc', 'sc', 'st'].every((value) =>
  existingCategoryValues.includes(value)
);

if (existingMemberModel && !hasCurrentCategorySchema) {
  mongoose.deleteModel('Member');
}

const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

export default Member;
export { Member };
