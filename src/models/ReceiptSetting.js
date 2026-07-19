import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const ReceiptSettingSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: true,
    default: 'Default Banking Receipt',
    trim: true,
  },
  institutionName: {
    type: String,
    required: true,
    default: 'Noble Cooperative Society',
    trim: true,
  },
  institutionAddress: {
    type: String,
    default: '',
    trim: true,
  },
  contactLine: {
    type: String,
    default: '',
    trim: true,
  },
  logoUrl: {
    type: String,
    default: '',
    trim: true,
  },
  receiptSize: {
    type: String,
    enum: ['A4', 'THERMAL_80'],
    default: 'A4',
  },
  showLogo: {
    type: Boolean,
    default: true,
  },
  showWatermark: {
    type: Boolean,
    default: true,
  },
  footerNote: {
    type: String,
    default: 'This is a computer generated receipt and does not require a physical signature.',
    trim: true,
  },
  authorizedSignatoryLabel: {
    type: String,
    default: 'Authorized Signatory',
    trim: true,
  },
});

ReceiptSettingSchema.plugin(baseSchemaPlugin);

const ReceiptSetting = mongoose.models.ReceiptSetting || mongoose.model('ReceiptSetting', ReceiptSettingSchema);

export default ReceiptSetting;
export { ReceiptSetting };
