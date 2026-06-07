import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const MemberDocumentSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    index: true,
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['aadhaar', 'pan', 'photo', 'signature', 'address_proof', 'other'],
    lowercase: true,
    trim: true,
  },
  documentName: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true,
  },
  cloudinaryUrl: {
    type: String,
    required: [true, 'Cloudinary URL is required'],
    trim: true,
  },
  verificationStatus: {
    type: String,
    required: true,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    lowercase: true,
    trim: true,
    index: true,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  verifiedAt: {
    type: Date,
  },
  remarks: {
    type: String,
    trim: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

MemberDocumentSchema.plugin(baseSchemaPlugin);

const MemberDocument = mongoose.models.MemberDocument || mongoose.model('MemberDocument', MemberDocumentSchema);

export default MemberDocument;
export { MemberDocument };
