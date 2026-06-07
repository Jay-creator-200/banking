import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const ApprovalRequestSchema = new mongoose.Schema({
  moduleName: {
    type: String,
    required: [true, 'Module name is required'],
    trim: true,
    uppercase: true,
  },
  referenceCollection: {
    type: String,
    required: [true, 'Reference collection name is required'],
    trim: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Reference document ID is required'],
    index: true,
  },
  requestType: {
    type: String,
    required: [true, 'Request type is required'],
    enum: ['CREATE', 'UPDATE', 'DELETE', 'REVERSAL'],
    uppercase: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester is required'],
    index: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    uppercase: true,
    index: true,
  },
  remarks: {
    type: String,
    trim: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  approvedAt: {
    type: Date,
  },
});

ApprovalRequestSchema.plugin(baseSchemaPlugin);

const ApprovalRequest = mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', ApprovalRequestSchema);

export default ApprovalRequest;
export { ApprovalRequest };
