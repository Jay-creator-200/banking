import ledgerService from './LedgerService.js';
import { AppError } from '../utils/error-handler.js';
import AccountHead from '../models/AccountHead.js';

export class OpeningBalanceService {
  async postOpeningBalance(data, userId) {
    const branchId = data.branchId;
    const cashAmount = Number(data.cashAmount || 0);
    const bankAmount = Number(data.bankAmount || 0);
    const total = Math.round((cashAmount + bankAmount) * 100) / 100;

    if (!branchId) throw AppError.validation('Branch is required');
    if (total <= 0) throw AppError.validation('Opening balance must be greater than zero');

    const cashHead = await AccountHead.findOne({ code: '11001' });
    const bankHead = await AccountHead.findOne({ code: '11002' });
    if (cashAmount > 0 && !cashHead) throw AppError.notFound('Cash in Hand account head 11001 not found');
    if (bankAmount > 0 && !bankHead) throw AppError.notFound('Cash at Bank account head 11002 not found');

    let equityHead = await AccountHead.findOne({ code: '31002' });
    if (!equityHead) {
      const parentHead = await AccountHead.findOne({ code: '31000', type: 'EQUITY', isDeleted: { $ne: true } });
      equityHead = await AccountHead.create({
        code: '31002',
        name: 'Opening Balance Equity',
        type: 'EQUITY',
        parentAccountId: parentHead?._id || null,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    const entries = [];
    if (cashAmount > 0) {
      entries.push({ accountHeadId: cashHead._id.toString(), debit: cashAmount, credit: 0, narration: 'Migrated opening cash in hand' });
    }
    if (bankAmount > 0) {
      entries.push({ accountHeadId: bankHead._id.toString(), debit: bankAmount, credit: 0, narration: 'Migrated opening bank balance' });
    }
    entries.push({ accountHeadId: equityHead._id.toString(), debit: 0, credit: total, narration: 'Opening balance equity for migrated balances' });

    return ledgerService.createVoucher({
      voucherType: 'JOURNAL',
      voucherDate: data.voucherDate ? new Date(data.voucherDate) : new Date(),
      branchId,
      narration: data.narration || 'Opening balance migration entry',
      entries,
    }, userId);
  }
}

const openingBalanceService = new OpeningBalanceService();
export default openingBalanceService;
export { openingBalanceService as OpeningBalanceServiceInstance };
