import BaseService from './BaseService.js';
import savingsAccountRepository from '../repositories/SavingsAccountRepository.js';
import mongoose from 'mongoose';

export class SavingsReportService extends BaseService {
  constructor() {
    super(savingsAccountRepository);
  }

  /**
   * Get the primary Savings Accounts Register.
   */
  async getAccountsRegister(filters = {}) {
    const query = {};
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.status) query.status = filters.status;
    if (filters.accountType) query.accountType = filters.accountType;

    const accounts = await this.repository.model
      .find(query)
      .populate('memberId')
      .populate('branchId')
      .sort({ openingDate: -1 });

    return accounts.map((acc) => ({
      accountId: acc._id,
      accountNo: acc.accountNo,
      memberName: acc.memberId?.fullName || 'N/A',
      memberNo: acc.memberId?.memberNo || 'N/A',
      branchName: acc.branchId?.name || 'N/A',
      accountType: acc.accountType,
      interestRate: acc.interestRate,
      minimumBalance: acc.minimumBalance,
      currentBalance: acc.currentBalance,
      availableBalance: acc.availableBalance,
      status: acc.status,
      openingDate: acc.openingDate,
    }));
  }

  /**
   * Get daily deposits and withdrawals summary and transaction log.
   */
  async getDailyTransactionReport(date, branchId = null) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const Transaction = mongoose.model('Transaction');
    const query = {
      status: 'POSTED',
      approvedAt: { $gte: start, $lte: end },
      transactionType: { $in: ['SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'INTEREST_CREDIT'] },
    };

    if (branchId) {
      query.branchId = branchId;
    }

    const txns = await Transaction.find(query)
      .populate('branchId')
      .populate('memberId')
      .sort({ approvedAt: 1 });

    let totalDeposits = 0;
    let countDeposits = 0;
    let totalWithdrawals = 0;
    let countWithdrawals = 0;
    let totalInterestCredits = 0;
    let countInterestCredits = 0;

    const logs = txns.map((t) => {
      const amt = t.amount;
      if (t.transactionType === 'SAVINGS_DEPOSIT') {
        totalDeposits += amt;
        countDeposits++;
      } else if (t.transactionType === 'SAVINGS_WITHDRAWAL') {
        totalWithdrawals += amt;
        countWithdrawals++;
      } else if (t.transactionType === 'INTEREST_CREDIT') {
        totalInterestCredits += amt;
        countInterestCredits++;
      }

      return {
        transactionNo: t.transactionNo,
        accountNo: t.accountId,
        memberName: t.memberId?.fullName || 'N/A',
        branchName: t.branchId?.name || 'N/A',
        transactionType: t.transactionType,
        paymentMode: t.paymentMode,
        amount: amt,
        narration: t.narration || '',
        referenceNo: t.referenceNo || '',
        approvedAt: t.approvedAt,
      };
    });

    return {
      date: start.toISOString().split('T')[0],
      summary: {
        deposits: { count: countDeposits, total: Number(totalDeposits.toFixed(2)) },
        withdrawals: { count: countWithdrawals, total: Number(totalWithdrawals.toFixed(2)) },
        interestCredits: { count: countInterestCredits, total: Number(totalInterestCredits.toFixed(2)) },
      },
      transactions: logs,
    };
  }

  /**
   * Get all dormant accounts.
   */
  async getDormantAccounts(branchId = null) {
    const query = { status: 'dormant' };
    if (branchId) query.branchId = branchId;

    const accounts = await this.repository.model
      .find(query)
      .populate('memberId')
      .populate('branchId')
      .sort({ updatedAt: -1 });

    return accounts.map((acc) => ({
      accountNo: acc.accountNo,
      memberName: acc.memberId?.fullName || 'N/A',
      memberNo: acc.memberId?.memberNo || 'N/A',
      branchName: acc.branchId?.name || 'N/A',
      balance: acc.currentBalance,
      lastActive: acc.updatedAt,
    }));
  }

  /**
   * Get all frozen accounts.
   */
  async getFrozenAccounts(branchId = null) {
    const query = { status: 'frozen' };
    if (branchId) query.branchId = branchId;

    const accounts = await this.repository.model
      .find(query)
      .populate('memberId')
      .populate('branchId')
      .sort({ updatedAt: -1 });

    return accounts.map((acc) => ({
      accountNo: acc.accountNo,
      memberName: acc.memberId?.fullName || 'N/A',
      memberNo: acc.memberId?.memberNo || 'N/A',
      branchName: acc.branchId?.name || 'N/A',
      balance: acc.currentBalance,
      freezeReason: acc.freezeReason,
      frozenAt: acc.updatedAt,
    }));
  }

  /**
   * Get all closed accounts.
   */
  async getClosedAccounts(branchId = null) {
    const query = { status: 'closed' };
    if (branchId) query.branchId = branchId;

    const accounts = await this.repository.model
      .find(query)
      .populate('memberId')
      .populate('branchId')
      .populate('closedBy', 'fullName')
      .sort({ closedAt: -1 });

    return accounts.map((acc) => ({
      accountNo: acc.accountNo,
      memberName: acc.memberId?.fullName || 'N/A',
      memberNo: acc.memberId?.memberNo || 'N/A',
      branchName: acc.branchId?.name || 'N/A',
      closedAt: acc.closedAt,
      closedByName: acc.closedBy?.fullName || 'System',
    }));
  }

  /**
   * Get accounts opened in a date range.
   */
  async getAccountOpenings(startDate, endDate, branchId = null) {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = {
      openingDate: { $gte: start, $lte: end },
    };
    if (branchId) query.branchId = branchId;

    const accounts = await this.repository.model
      .find(query)
      .populate('memberId')
      .populate('branchId')
      .sort({ openingDate: 1 });

    return accounts.map((acc) => ({
      accountNo: acc.accountNo,
      memberName: acc.memberId?.fullName || 'N/A',
      memberNo: acc.memberId?.memberNo || 'N/A',
      branchName: acc.branchId?.name || 'N/A',
      accountType: acc.accountType,
      openingDate: acc.openingDate,
      openingBalance: acc.currentBalance,
    }));
  }
}

const savingsReportServiceInstance = new SavingsReportService();
export default savingsReportServiceInstance;
export { savingsReportServiceInstance as SavingsReportServiceInstance };
