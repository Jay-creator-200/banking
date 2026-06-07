import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const AccountHeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Account head name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Account head code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  type: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY'],
    uppercase: true,
    index: true,
  },
  parentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountHead',
    default: null,
    index: true,
  },
});

AccountHeadSchema.plugin(baseSchemaPlugin);

const AccountHead = mongoose.models.AccountHead || mongoose.model('AccountHead', AccountHeadSchema);

export default AccountHead;
export { AccountHead };
