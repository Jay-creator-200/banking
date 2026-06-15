import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const NotificationSchema = new mongoose.Schema({
  notificationNo: {
    type: String,
    required: [true, 'Notification number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    index: true,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null,
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'],
    uppercase: true,
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Notification category is required'],
    enum: ['transaction', 'loan', 'deposit', 'reminder', 'system', 'security'],
    lowercase: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'failed', 'read'],
    lowercase: true,
    default: 'pending',
    index: true,
  },
  sentAt: {
    type: Date,
    default: null,
  },
});

NotificationSchema.plugin(baseSchemaPlugin);

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

export default Notification;
export { Notification };
