import BaseService from './BaseService.js';
import cashSessionRepository from '../repositories/CashSessionRepository.js';
import vaultTransactionRepository from '../repositories/VaultTransactionRepository.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class CashReportService extends BaseService {
  constructor() {
    super(cashSessionRepository);
  }

  /**
   * Daily Cash Position Report — summarizes all teller sessions for a given date/branch.
   *
   * @param {string} branchId - Branch ID (optional, all branches if null)
   * @param {string} dateStr - ISO date string (YYYY-MM-DD)
   * @returns {Promise<Object>} Report data
   */
  async getDailyCashPosition(branchId, dateStr) {
    try {
      const date = dateStr ? new Date(dateStr) : new Date();
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const sessionFilter = {
        sessionDate: { $gte: dayStart, $lte: dayEnd },
      };
      if (branchId) sessionFilter.branchId = new mongoose.Types.ObjectId(branchId);

      const sessions = await cashSessionRepository.model
        .find(sessionFilter)
        .populate('userId', 'name email')
        .populate('branchId', 'branchName branchCode')
        .sort('-openedAt')
        .lean()
        .exec();

      // Aggregate register entries for all sessions
      const CashTransactionRegister = mongoose.model('CashTransactionRegister');

      const sessionIds = sessions.map((s) => s._id);
      const registerAgg = await CashTransactionRegister.aggregate([
        { $match: { sessionId: { $in: sessionIds } } },
        {
          $group: {
            _id: {
              sessionId: '$sessionId',
              transactionType: '$transactionType',
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      // Build lookup map
      const registerMap = {};
      for (const row of registerAgg) {
        const sid = row._id.sessionId.toString();
        if (!registerMap[sid]) registerMap[sid] = { deposits: 0, withdrawals: 0, depositCount: 0, withdrawalCount: 0 };
        if (row._id.transactionType === 'deposit' || row._id.transactionType === 'receipt') {
          registerMap[sid].deposits += row.total;
          registerMap[sid].depositCount += row.count;
        } else {
          registerMap[sid].withdrawals += row.total;
          registerMap[sid].withdrawalCount += row.count;
        }
      }

      const sessionRows = sessions.map((s) => {
        const sid = s._id.toString();
        const reg = registerMap[sid] || { deposits: 0, withdrawals: 0, depositCount: 0, withdrawalCount: 0 };
        return {
          sessionNo: s.sessionNo,
          teller: s.userId?.name || 'N/A',
          tellerEmail: s.userId?.email || '',
          branch: s.branchId?.branchName || 'N/A',
          status: s.status,
          openingBalance: s.openingBalance,
          systemBalance: s.systemBalance,
          physicalBalance: s.physicalBalance,
          differenceAmount: s.differenceAmount,
          totalDeposits: reg.deposits,
          depositCount: reg.depositCount,
          totalWithdrawals: reg.withdrawals,
          withdrawalCount: reg.withdrawalCount,
          openedAt: s.openedAt,
          closedAt: s.closedAt,
        };
      });

      // Summary
      const summary = {
        totalSessions: sessions.length,
        openSessions: sessions.filter((s) => s.status === 'open').length,
        closedSessions: sessions.filter((s) => s.status === 'closed').length,
        totalOpeningCash: sessions.reduce((acc, s) => acc + s.openingBalance, 0),
        totalDeposits: sessionRows.reduce((acc, r) => acc + r.totalDeposits, 0),
        totalWithdrawals: sessionRows.reduce((acc, r) => acc + r.totalWithdrawals, 0),
        totalDifference: sessionRows.reduce((acc, r) => acc + r.differenceAmount, 0),
      };

      return { sessions: sessionRows, summary };
    } catch (error) {
      this.handleError(error, 'Failed to generate daily cash position report');
    }
  }

  /**
   * Vault Position Report — shows vault balance history for a branch.
   *
   * @param {string} branchId - Branch ID
   * @param {string} startDate - ISO date string
   * @param {string} endDate - ISO date string
   * @returns {Promise<Object>} Report data
   */
  async getVaultPositionReport(branchId, startDate, endDate) {
    try {
      const filter = {};
      if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);
      if (startDate && endDate) {
        filter.transactionDate = {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      }

      const transactions = await vaultTransactionRepository.model
        .find(filter)
        .populate('branchId', 'branchName branchCode')
        .populate('createdBy', 'name')
        .sort('transactionDate')
        .lean()
        .exec();

      const currentBalance = branchId
        ? await vaultTransactionRepository.getLatestVaultBalance(branchId)
        : null;

      const totalIn = transactions.filter((t) => t.transactionType === 'VAULT_IN').reduce((s, t) => s + t.amount, 0);
      const totalOut = transactions.filter((t) => t.transactionType === 'VAULT_OUT').reduce((s, t) => s + t.amount, 0);

      return {
        transactions: transactions.map((t) => ({
          vaultTxnNo: t.vaultTxnNo,
          transactionDate: t.transactionDate,
          transactionType: t.transactionType,
          amount: t.amount,
          vaultBalanceBefore: t.vaultBalanceBefore,
          vaultBalanceAfter: t.vaultBalanceAfter,
          narration: t.narration,
          branch: t.branchId?.branchName || 'N/A',
          postedBy: t.createdBy?.name || 'N/A',
        })),
        summary: {
          currentBalance,
          totalVaultIn: totalIn,
          totalVaultOut: totalOut,
          netMovement: totalIn - totalOut,
          transactionCount: transactions.length,
        },
      };
    } catch (error) {
      this.handleError(error, 'Failed to generate vault position report');
    }
  }

  /**
   * Teller Performance Report — sessions per teller over a date range.
   *
   * @param {string} branchId - Branch ID
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<Array>}
   */
  async getTellerPerformanceReport(branchId, startDate, endDate) {
    try {
      const matchStage = { status: 'closed' };
      if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);
      if (startDate && endDate) {
        matchStage.closedAt = {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      }

      const results = await cashSessionRepository.model.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$userId',
            totalSessions: { $sum: 1 },
            totalOpeningBalance: { $sum: '$openingBalance' },
            totalDifference: { $sum: '$differenceAmount' },
            avgDifference: { $avg: '$differenceAmount' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $sort: { totalSessions: -1 } },
      ]);

      return results.map((r) => ({
        teller: r.user.name || 'N/A',
        email: r.user.email || '',
        totalSessions: r.totalSessions,
        totalOpeningBalance: r.totalOpeningBalance,
        totalDifference: r.totalDifference,
        avgDifference: Math.round(r.avgDifference * 100) / 100,
      }));
    } catch (error) {
      this.handleError(error, 'Failed to generate teller performance report');
    }
  }
}

const cashReportServiceInstance = new CashReportService();
export default cashReportServiceInstance;
export { cashReportServiceInstance as CashReportServiceInstance };
