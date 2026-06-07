import mongoose from 'mongoose';

const CashTransactionRegisterSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    required: [true, 'Session association is required'],
    index: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'Transaction association is required'],
    index: true,
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'receipt', 'payment'],
    lowercase: true,
    trim: true,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  referenceNo: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const CashTransactionRegister = mongoose.models.CashTransactionRegister || mongoose.model('CashTransactionRegister', CashTransactionRegisterSchema);

export default CashTransactionRegister;
export { CashTransactionRegister };
