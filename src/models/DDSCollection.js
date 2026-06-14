import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const DDSCollectionSchema = new mongoose.Schema({
  ddsAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DDSAccount',
    required: [true, 'DDS Account reference is required'],
    index: true,
  },
  collectionDate: {
    type: Date,
    required: [true, 'Collection date is required'],
    default: Date.now,
  },
  amount: {
    type: Number,
    required: [true, 'Collection amount is required'],
    min: [0.01, 'Collection amount must be positive'],
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Collector User reference is required'],
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['posted', 'pending_approval'],
    default: 'posted',
    lowercase: true,
    index: true,
  },
});

DDSCollectionSchema.plugin(baseSchemaPlugin);

const DDSCollection = mongoose.models.DDSCollection || mongoose.model('DDSCollection', DDSCollectionSchema);

export default DDSCollection;
export { DDSCollection };
