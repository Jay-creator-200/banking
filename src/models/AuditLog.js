import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: String, // String representation of Mongoose ObjectId or system tag
    required: [true, 'Operator user ID is required'],
    index: true,
  },
  moduleName: {
    type: String,
    required: [true, 'Module name is required'],
    trim: true,
    index: true,
  },
  actionName: {
    type: String,
    required: [true, 'Action name is required'],
    trim: true,
    index: true,
  },
  referenceCollection: {
    type: String,
    trim: true,
    index: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

export default AuditLog;
export { AuditLog };
