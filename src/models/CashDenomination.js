import mongoose from 'mongoose';

const CashDenominationSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    required: [true, 'Session association is required'],
    index: true,
  },
  denomination: {
    type: Number,
    required: [true, 'Denomination value is required'],
  },
  count: {
    type: Number,
    required: [true, 'Denomination count is required'],
    min: [0, 'Count cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['opening', 'closing'],
    lowercase: true,
    trim: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const CashDenomination = mongoose.models.CashDenomination || mongoose.model('CashDenomination', CashDenominationSchema);

export default CashDenomination;
export { CashDenomination };
