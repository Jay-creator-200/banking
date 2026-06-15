import mongoose from 'mongoose';
import IncomeEntry from '../models/IncomeEntry.js';
import LedgerService from './LedgerService.js';
import SequenceService from './SequenceService.js';
import auditLogService from './AuditLogService.js';
import { AppError } from '../utils/error-handler.js';

export class IncomeService {
  /**
   * Create income entry and post accounting entry immediately
   */
  async createIncome(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const branchId = data.branchId;
      const branch = await mongoose.model('Branch').findById(branchId).session(session);
      if (!branch) {
        throw AppError.notFound('Branch not found');
      }

      // Generate sequence code
      const seqNo = await SequenceService.generateVoucherNo(branchId, session);
      const incomeNo = `INC-${branch.branchCode}-${Date.now().toString().slice(-6)}-${seqNo.slice(-3)}`;

      // Identify Cash/Bank account head to debit
      const debitHeadCode = data.paymentMode === 'CASH' ? '11001' : '11002';
      const debitHead = await mongoose.model('AccountHead').findOne({ code: debitHeadCode }).session(session);
      if (!debitHead) {
        throw AppError.notFound(`Account head code ${debitHeadCode} (Cash/Bank) not found in Chart of Accounts.`);
      }

      // Create income entry first
      const income = new IncomeEntry({
        ...data,
        incomeNo,
        createdBy: userId,
        updatedBy: userId,
      });

      // Trigger accounting posting
      const voucherPayload = {
        voucherDate: new Date(),
        voucherType: data.paymentMode === 'CASH' ? 'RECEIPT' : 'JOURNAL',
        branchId,
        narration: `Income Entry: ${incomeNo} - ${data.description || ''}`,
        entries: [
          {
            accountHeadId: debitHead._id,
            debit: data.amount,
            credit: 0,
            narration: data.description,
          },
          {
            accountHeadId: data.accountHeadId,
            debit: 0,
            credit: data.amount,
            narration: data.description,
          },
        ],
      };

      const voucher = await LedgerService.createVoucher(voucherPayload, userId, session);

      // Link voucher to income and save
      income.voucherId = voucher._id;
      await income.save({ session });

      // Log Audit Event
      await auditLogService.logAction(
        userId,
        'INCOME',
        'INCOME_RECORDED',
        'IncomeEntry',
        income._id,
        null,
        { incomeNo, amount: data.amount, voucherId: voucher._id }
      );

      await session.commitTransaction();
      session.endSession();

      return income;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Get income entries
   */
  async getIncomeEntries(filters = {}, options = {}) {
    try {
      return await IncomeEntry.find(filters)
        .populate('accountHeadId')
        .populate('branchId')
        .populate('voucherId')
        .sort(options.sort || '-createdAt')
        .exec();
    } catch (error) {
      throw AppError.validation(`Failed to fetch income entries: ${error.message}`);
    }
  }
}

const incomeServiceInstance = new IncomeService();
export default incomeServiceInstance;
export { incomeServiceInstance as IncomeServiceInstance };
