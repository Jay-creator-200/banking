import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const ShareCertificateSchema = new mongoose.Schema({
  certificateNo: {
    type: String,
    required: [true, 'Certificate number is required'],
    unique: true,
    trim: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    index: true,
  },
  issuedDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  sharesIssued: {
    type: Number,
    required: [true, 'Shares issued count is required'],
    min: [1, 'Must issue at least 1 share'],
  },
  shareValue: {
    type: Number,
    required: true,
    default: 10,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'cancelled'],
    default: 'active',
    lowercase: true,
    trim: true,
    index: true,
  },
});

ShareCertificateSchema.plugin(baseSchemaPlugin);

const ShareCertificate = mongoose.models.ShareCertificate || mongoose.model('ShareCertificate', ShareCertificateSchema);

export default ShareCertificate;
export { ShareCertificate };
