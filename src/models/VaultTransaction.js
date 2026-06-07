import mongoose from 'mongoose';
import baseSchemaPlugin from './base.schema.js';

const VaultTransactionSchema = new mongoose.Schema({
  vaultTxnNo: {
    type: String,
    required: [true, 'Vault transaction number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch association is required'],
    index: true,
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required'],
    index: true,
  },
  transactionType: {
    type: String,
    required: true,
    // VAULT_IN: cash received into vault, VAULT_OUT: cash issued from vault
    enum: ['VAULT_IN', 'VAULT_OUT'],
    uppercase: true,
    trim: true,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1'],
  },
  vaultBalanceBefore: {
    type: Number,
    required: true,
    default: 0,
  },
  vaultBalanceAfter: {
    type: Number,
    required: true,
    default: 0,
  },
  // Link to the cash transfer that triggered this vault movement (optional)
  transferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashTransfer',
    default: null,
    index: true,
  },
  // Link to teller session involved (optional, for teller <-> vault)
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    default: null,
    index: true,
  },
  narration: {
    type: String,
    trim: true,
  },
});

VaultTransactionSchema.plugin(baseSchemaPlugin);

const VaultTransaction = mongoose.models.VaultTransaction || mongoose.model('VaultTransaction', VaultTransactionSchema);

export default VaultTransaction;
export { VaultTransaction };
