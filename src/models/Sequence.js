import mongoose from 'mongoose';

const SequenceSchema = new mongoose.Schema(
  {
    prefix: {
      type: String,
      required: [true, 'Prefix is required'],
      uppercase: true,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch is required'],
      index: true,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      index: true,
    },
    currentValue: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for atomicity
SequenceSchema.index({ prefix: 1, branchId: 1, year: 1 }, { unique: true });

const Sequence = mongoose.models.Sequence || mongoose.model('Sequence', SequenceSchema);

export default Sequence;
export { Sequence };
