import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const DigitalStatementSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Member association is required'],
    index: true,
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['savings', 'loan', 'fd', 'rd', 'dds', 'mis'],
    lowercase: true,
    trim: true,
  },
  accountId: {
    type: String,
    required: [true, 'Account ID is required'],
    trim: true,
    index: true,
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['statement', 'certificate'],
    lowercase: true,
    trim: true,
  },
  format: {
    type: String,
    required: [true, 'Format is required'],
    enum: ['pdf', 'excel'],
    lowercase: true,
    trim: true,
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
  },
  cloudinaryUrl: {
    type: String,
    required: [true, 'Cloudinary URL is required'],
    trim: true,
  },
  generatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

DigitalStatementSchema.plugin(baseSchemaPlugin);

const DigitalStatement =
  mongoose.models.DigitalStatement ||
  mongoose.model('DigitalStatement', DigitalStatementSchema);

export default DigitalStatement;
export { DigitalStatement };
