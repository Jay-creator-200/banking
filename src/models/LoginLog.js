import mongoose from 'mongoose';

const LoginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required for tracking'],
    trim: true,
    lowercase: true,
    index: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  loginStatus: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'LOGOUT'],
    required: [true, 'Login status is required'],
    uppercase: true,
    index: true,
  },
  loggedInAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
});

const LoginLog = mongoose.models.LoginLog || mongoose.model('LoginLog', LoginLogSchema);

export default LoginLog;
export { LoginLog };
