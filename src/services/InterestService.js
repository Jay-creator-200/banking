import BaseService from './BaseService.js';
import savingsInterestHistoryRepository from '../repositories/SavingsInterestHistoryRepository.js';
import transactionService from './TransactionService.js';
import savingsAccountRepository from '../repositories/SavingsAccountRepository.js';
import { savingsInterestPostSchema } from '../schemas/savings.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class InterestService extends BaseService {
  constructor() {
    super(savingsInterestHistoryRepository);
  }

  /**
   * Calculate interest for an account using Daily Product Method.
   *
   * @param {string} accountId - Savings account object ID
   * @param {Date|string} startDate - Range start date
   * @param {Date|string} endDate - Range end date
   * @returns {Promise<Object>} Calculated interest and breakdown details
   */
  async calculateInterest(accountId, startDate, endDate) {
    const SavingsAccount = mongoose.model('SavingsAccount');
    const account = await SavingsAccount.findById(accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw AppError.validation('Invalid date range specified');
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const Transaction = mongoose.model('Transaction');

    // 1. Get net balance before startDate (Sum of all POSTED deposits/credits minus withdrawals before startDate)
    const beforeTxns = await Transaction.find({
      accountId: account.accountNo,
      status: 'POSTED',
      approvedAt: { $lt: start },
    });

    let balance = 0;
    for (const txn of beforeTxns) {
      if (txn.transactionType === 'SAVINGS_DEPOSIT' || txn.transactionType === 'INTEREST_CREDIT') {
        balance += txn.amount;
      } else if (txn.transactionType === 'SAVINGS_WITHDRAWAL') {
        balance -= txn.amount;
      }
    }

    // 2. Get range transactions
    const rangeTxns = await Transaction.find({
      accountId: account.accountNo,
      status: 'POSTED',
      approvedAt: { $gte: start, $lte: end },
    }).sort('approvedAt');

    // Group changes by day
    const dailyChanges = {};
    for (const txn of rangeTxns) {
      const dateStr = new Date(txn.approvedAt).toISOString().split('T')[0];
      let change = 0;
      if (txn.transactionType === 'SAVINGS_DEPOSIT' || txn.transactionType === 'INTEREST_CREDIT') {
        change = txn.amount;
      } else if (txn.transactionType === 'SAVINGS_WITHDRAWAL') {
        change = -txn.amount;
      }
      dailyChanges[dateStr] = (dailyChanges[dateStr] || 0) + change;
    }

    // 3. Iterate day-by-day to calculate daily closing product interest
    let totalInterest = 0;
    const rate = account.interestRate / 100;
    const breakdown = [];

    let currDate = new Date(start);
    while (currDate <= end) {
      const dateStr = currDate.toISOString().split('T')[0];
      if (dailyChanges[dateStr] !== undefined) {
        balance += dailyChanges[dateStr];
      }
      const dayInterest = (balance * rate) / 365;
      totalInterest += dayInterest;

      breakdown.push({
        date: dateStr,
        closingBalance: balance,
        interestEarned: Number(dayInterest.toFixed(4)),
      });

      currDate.setDate(currDate.getDate() + 1);
    }

    return {
      accountId: account._id,
      accountNo: account.accountNo,
      interestRate: account.interestRate,
      interestAmount: Number(totalInterest.toFixed(2)),
      periodStart: start,
      periodEnd: end,
      breakdown,
    };
  }

  /**
   * Post batch interest for all active savings accounts of a branch.
   *
   * @param {Object} data - Schema validated interest details
   * @param {string} userId - Operating user ID
   * @returns {Promise<Object>} Summary of posted batch
   */
  async postBatchInterest(data, userId) {
    const validated = this.validate(savingsInterestPostSchema, data);

    const SavingsAccount = mongoose.model('SavingsAccount');
    const query = { status: 'active' };
    if (validated.branchId) {
      query.branchId = validated.branchId;
    }

    const accounts = await SavingsAccount.find(query);
    if (accounts.length === 0) {
      return { message: 'No active savings accounts found for interest posting.', count: 0, totalInterest: 0 };
    }

    let processedCount = 0;
    let totalInterestPosted = 0;

    for (const account of accounts) {
      try {
        const calc = await this.calculateInterest(account._id, validated.periodStart, validated.periodEnd);
        if (calc.interestAmount <= 0.01) {
          continue; // skip tiny or zero interest amounts
        }

        // Post PENDING interest credit transaction
        const transaction = await transactionService.createTransaction({
          branchId: account.branchId,
          memberId: account.memberId,
          accountType: 'savings',
          accountId: account.accountNo,
          transactionType: 'INTEREST_CREDIT',
          paymentMode: 'TRANSFER',
          amount: calc.interestAmount,
          referenceNo: `INT-${new Date(validated.periodEnd).getFullYear()}`,
          narration: `Interest credit from ${new Date(validated.periodStart).toLocaleDateString()} to ${new Date(validated.periodEnd).toLocaleDateString()}`,
        }, userId);

        // Record the interest calculation log
        await this.repository.create({
          accountId: account._id,
          interestRate: account.interestRate,
          interestAmount: calc.interestAmount,
          postingDate: new Date(),
          periodStart: validated.periodStart,
          periodEnd: validated.periodEnd,
          postedBy: userId,
          transactionId: transaction._id,
        });

        processedCount++;
        totalInterestPosted += calc.interestAmount;
      } catch (error) {
        console.error(`Failed to post interest for account ${account.accountNo}:`, error);
        // Continue to other accounts
      }
    }

    return {
      message: 'Batch interest posting requests queued successfully.',
      count: processedCount,
      totalInterest: Number(totalInterestPosted.toFixed(2)),
    };
  }
}

const interestServiceInstance = new InterestService();
export default interestServiceInstance;
export { interestServiceInstance as InterestServiceInstance };
