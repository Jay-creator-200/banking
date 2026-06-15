import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const NotificationPreferenceSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    unique: true,
    index: true,
  },
  smsEnabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  emailEnabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  whatsappEnabled: {
    type: Boolean,
    required: true,
    default: true,
  },
  transactionAlerts: {
    type: Boolean,
    required: true,
    default: true,
  },
  loanAlerts: {
    type: Boolean,
    required: true,
    default: true,
  },
  depositAlerts: {
    type: Boolean,
    required: true,
    default: true,
  },
  marketingAlerts: {
    type: Boolean,
    required: true,
    default: false,
  },
});

NotificationPreferenceSchema.plugin(baseSchemaPlugin);

const NotificationPreference =
  mongoose.models.NotificationPreference ||
  mongoose.model('NotificationPreference', NotificationPreferenceSchema);

export default NotificationPreference;
export { NotificationPreference };
