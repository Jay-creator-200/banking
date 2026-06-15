import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const MemberPortalAccountSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    unique: true,
    index: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  isLocked: {
    type: Boolean,
    required: true,
    default: false,
  },
  failedLoginAttempts: {
    type: Number,
    required: true,
    default: 0,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    trim: true,
    default: null,
  },
});

MemberPortalAccountSchema.plugin(baseSchemaPlugin);

const MemberPortalAccount =
  mongoose.models.MemberPortalAccount ||
  mongoose.model('MemberPortalAccount', MemberPortalAccountSchema);

export default MemberPortalAccount;
export { MemberPortalAccount };
