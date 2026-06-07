import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
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
  employeeCode: {
    type: String,
    required: [true, 'Employee code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role association is required'],
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  profilePhoto: {
    type: String,
    trim: true,
  },
  lastLoginAt: {
    type: Date,
  },
  lastLoginIp: {
    type: String,
    trim: true,
  },
  passwordChangedAt: {
    type: Date,
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
});

UserSchema.plugin(baseSchemaPlugin);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
export { User };
