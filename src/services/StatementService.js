import BaseService from './BaseService.js';
import savingsAccountRepository from '../repositories/SavingsAccountRepository.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class StatementService extends BaseService {
  constructor() {
    super(savingsAccountRepository);
  }

  /**
   * Retrieve the running passbook ledger rows for an account.
   *
   * @param {string} accountId - Savings account database ID
   * @returns {Promise<Array<Object>>} Passbook statement rows
   */
  async getPassbook(accountId) {
    const account = await this.repository.findById(accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }

    const Transaction = mongoose.model('Transaction');
    const txns = await Transaction.find({
      accountId: account.accountNo,
      status: 'POSTED',
    }).sort({ approvedAt: 1, _id: 1 });

    let runningBalance = 0;
    const rows = txns.map((txn) => {
      const isDebit = txn.transactionType === 'SAVINGS_WITHDRAWAL';
      const debit = isDebit ? txn.amount : 0;
      const credit = !isDebit ? txn.amount : 0;
      
      if (txn.balanceAfter !== undefined && txn.balanceAfter !== null) {
        runningBalance = txn.balanceAfter;
      } else {
        runningBalance += credit - debit;
      }

      return {
        _id: txn._id,
        date: txn.approvedAt || txn.createdAt,
        transactionNo: txn.transactionNo,
        narration: txn.narration || '',
        paymentMode: txn.paymentMode,
        referenceNo: txn.referenceNo || '',
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return rows;
  }

  /**
   * Fetch customizable statement logs with opening/closing balances.
   *
   * @param {string} accountId - Savings account database ID
   * @param {Object} filters - Search filters (startDate, endDate, transactionType)
   * @returns {Promise<Object>} Statement envelope
   */
  async getStatement(accountId, filters = {}) {
    const account = await this.repository.findById(accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }

    const Transaction = mongoose.model('Transaction');

    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    // 1. Calculate opening balance (net balance of all transactions before startDate)
    let openingBalance = 0;
    if (startDate) {
      const priorTxns = await Transaction.find({
        accountId: account.accountNo,
        status: 'POSTED',
        approvedAt: { $lt: startDate },
      });

      for (const txn of priorTxns) {
        if (txn.transactionType === 'SAVINGS_DEPOSIT' || txn.transactionType === 'INTEREST_CREDIT') {
          openingBalance += txn.amount;
        } else if (txn.transactionType === 'SAVINGS_WITHDRAWAL') {
          openingBalance -= txn.amount;
        }
      }
    }

    // 2. Fetch range transactions matching filters
    const query = {
      accountId: account.accountNo,
      status: 'POSTED',
    };

    if (startDate || endDate) {
      query.approvedAt = {};
      if (startDate) query.approvedAt.$gte = startDate;
      if (endDate) query.approvedAt.$lte = endDate;
    }

    if (filters.transactionType) {
      query.transactionType = filters.transactionType;
    }

    const txns = await Transaction.find(query).sort({ approvedAt: 1, _id: 1 });

    // 3. Construct rows
    let currentBal = openingBalance;
    const rows = txns.map((txn) => {
      const isDebit = txn.transactionType === 'SAVINGS_WITHDRAWAL';
      const debit = isDebit ? txn.amount : 0;
      const credit = !isDebit ? txn.amount : 0;
      currentBal += credit - debit;

      return {
        _id: txn._id,
        date: txn.approvedAt || txn.createdAt,
        transactionNo: txn.transactionNo,
        narration: txn.narration || '',
        paymentMode: txn.paymentMode,
        referenceNo: txn.referenceNo || '',
        debit,
        credit,
        balance: currentBal,
      };
    });

    return {
      account: {
        accountNo: account.accountNo,
        accountType: account.accountType,
        interestRate: account.interestRate,
        minimumBalance: account.minimumBalance,
        status: account.status,
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        transactionType: filters.transactionType || null,
      },
      openingBalance,
      closingBalance: currentBal,
      transactionsCount: rows.length,
      rows,
    };
  }
}

const statementServiceInstance = new StatementService();
export default statementServiceInstance;
export { statementServiceInstance as StatementServiceInstance };
