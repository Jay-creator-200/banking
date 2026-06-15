import mongoose from 'mongoose';
import LedgerEntry from '../models/LedgerEntry.js';
import AccountHead from '../models/AccountHead.js';
import { AppError } from '../utils/error-handler.js';

export class FinancialReportService {
  /**
   * Helper to resolve account heads and map by ID
   */
  async _getAccountHeadsMap() {
    const heads = await AccountHead.find({});
    const map = {};
    heads.forEach((h) => {
      map[h._id.toString()] = h;
    });
    return map;
  }

  /**
   * Generate Trial Balance Report
   */
  async getTrialBalance({ startDate, endDate, branchId, accountGroup }) {
    try {
      const match = {};
      if (branchId) {
        match.branchId = new mongoose.Types.ObjectId(branchId);
      }
      if (startDate || endDate) {
        match.entryDate = {};
        if (startDate) match.entryDate.$gte = new Date(startDate);
        if (endDate) match.entryDate.$lte = new Date(endDate);
      }

      // Aggregate ledger postings
      const aggregates = await LedgerEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$accountHeadId',
            totalDebit: { $sum: '$debitAmount' },
            totalCredit: { $sum: '$creditAmount' },
          },
        },
      ]);

      const headsMap = await this._getAccountHeadsMap();
      const reportRows = [];
      let totalDebits = 0;
      let totalCredits = 0;

      for (const agg of aggregates) {
        const head = headsMap[agg._id.toString()];
        if (!head) continue;

        // Apply account group filter if specified
        if (accountGroup) {
          if (head.type !== accountGroup && head.parentAccountId?.toString() !== accountGroup) {
            continue;
          }
        }

        const isAssetOrExpense = ['ASSET', 'EXPENSE'].includes(head.type);
        let debitBalance = 0;
        let creditBalance = 0;

        if (isAssetOrExpense) {
          const bal = agg.totalDebit - agg.totalCredit;
          if (bal > 0) debitBalance = bal;
          else if (bal < 0) creditBalance = Math.abs(bal);
        } else {
          const bal = agg.totalCredit - agg.totalDebit;
          if (bal > 0) creditBalance = bal;
          else if (bal < 0) debitBalance = Math.abs(bal);
        }

        if (debitBalance > 0 || creditBalance > 0) {
          reportRows.push({
            accountHeadId: head._id,
            accountName: head.name,
            accountCode: head.code,
            accountType: head.type,
            debitBalance,
            creditBalance,
          });
          totalDebits += debitBalance;
          totalCredits += creditBalance;
        }
      }

      // Sort rows by account code
      reportRows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      return {
        rows: reportRows,
        totalDebits: Math.round(totalDebits * 100) / 100,
        totalCredits: Math.round(totalCredits * 100) / 100,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw AppError.validation(`Failed to generate Trial Balance: ${error.message}`);
    }
  }

  /**
   * Generate Balance Sheet Report
   */
  async getBalanceSheet({ date, branchId }) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const match = { entryDate: { $lte: targetDate } };
      if (branchId) {
        match.branchId = new mongoose.Types.ObjectId(branchId);
      }

      // Aggregate ledger postings
      const aggregates = await LedgerEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$accountHeadId',
            totalDebit: { $sum: '$debitAmount' },
            totalCredit: { $sum: '$creditAmount' },
          },
        },
      ]);

      const headsMap = await this._getAccountHeadsMap();
      const assets = [];
      const liabilities = [];
      const equity = [];

      let assetsTotal = 0;
      let liabilitiesTotal = 0;
      let equityTotal = 0;
      let netProfitLoss = 0;

      // Group and calculate net balances
      for (const agg of aggregates) {
        const head = headsMap[agg._id.toString()];
        if (!head) continue;

        const debit = agg.totalDebit;
        const credit = agg.totalCredit;

        if (head.type === 'ASSET') {
          const balance = debit - credit;
          if (balance !== 0) {
            assets.push({ accountName: head.name, code: head.code, balance });
            assetsTotal += balance;
          }
        } else if (head.type === 'LIABILITY') {
          const balance = credit - debit;
          if (balance !== 0) {
            liabilities.push({ accountName: head.name, code: head.code, balance });
            liabilitiesTotal += balance;
          }
        } else if (head.type === 'EQUITY') {
          const balance = credit - debit;
          if (balance !== 0) {
            equity.push({ accountName: head.name, code: head.code, balance });
            equityTotal += balance;
          }
        } else if (head.type === 'INCOME') {
          netProfitLoss += (credit - debit);
        } else if (head.type === 'EXPENSE') {
          netProfitLoss -= (debit - credit);
        }
      }

      // Add Net Profit/Loss to Equity list
      equity.push({
        accountName: 'Current Period Net Profit/Loss',
        code: 'RET-EARN',
        balance: Math.round(netProfitLoss * 100) / 100,
      });
      equityTotal += netProfitLoss;

      // Format rounding
      assetsTotal = Math.round(assetsTotal * 100) / 100;
      liabilitiesTotal = Math.round(liabilitiesTotal * 100) / 100;
      equityTotal = Math.round(equityTotal * 100) / 100;
      const difference = Math.round((assetsTotal - (liabilitiesTotal + equityTotal)) * 100) / 100;

      return {
        assets: assets.sort((a, b) => a.code.localeCompare(b.code)),
        liabilities: liabilities.sort((a, b) => a.code.localeCompare(b.code)),
        equity: equity.sort((a, b) => a.code.localeCompare(b.code)),
        assetsTotal,
        liabilitiesTotal,
        equityTotal,
        difference,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw AppError.validation(`Failed to generate Balance Sheet: ${error.message}`);
    }
  }

  /**
   * Generate Profit & Loss Statement Report
   */
  async getProfitLoss({ startDate, endDate, branchId }) {
    try {
      const match = {};
      if (branchId) {
        match.branchId = new mongoose.Types.ObjectId(branchId);
      }
      if (startDate || endDate) {
        match.entryDate = {};
        if (startDate) match.entryDate.$gte = new Date(startDate);
        if (endDate) match.entryDate.$lte = new Date(endDate);
      }

      // Aggregate ledger postings
      const aggregates = await LedgerEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$accountHeadId',
            totalDebit: { $sum: '$debitAmount' },
            totalCredit: { $sum: '$creditAmount' },
          },
        },
      ]);

      const headsMap = await this._getAccountHeadsMap();
      const incomeList = [];
      const expenseList = [];
      let totalIncome = 0;
      let totalExpense = 0;

      for (const agg of aggregates) {
        const head = headsMap[agg._id.toString()];
        if (!head) continue;

        if (head.type === 'INCOME') {
          const balance = agg.totalCredit - agg.totalDebit;
          if (balance !== 0) {
            incomeList.push({ accountName: head.name, code: head.code, balance });
            totalIncome += balance;
          }
        } else if (head.type === 'EXPENSE') {
          const balance = agg.totalDebit - agg.totalCredit;
          if (balance !== 0) {
            expenseList.push({ accountName: head.name, code: head.code, balance });
            totalExpense += balance;
          }
        }
      }

      totalIncome = Math.round(totalIncome * 100) / 100;
      totalExpense = Math.round(totalExpense * 100) / 100;
      const netProfitLoss = Math.round((totalIncome - totalExpense) * 100) / 100;

      return {
        income: incomeList.sort((a, b) => a.code.localeCompare(b.code)),
        expenses: expenseList.sort((a, b) => a.code.localeCompare(b.code)),
        totalIncome,
        totalExpense,
        netProfitLoss,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw AppError.validation(`Failed to generate Profit & Loss: ${error.message}`);
    }
  }

  /**
   * Generate Cash Flow Statement Report
   */
  async getCashFlow({ startDate, endDate, branchId }) {
    try {
      const sDate = startDate ? new Date(startDate) : new Date('2026-01-01');
      const eDate = endDate ? new Date(endDate) : new Date();

      // Find Cash account head IDs (Cash in Hand '11001' and Cash at Bank '11002')
      const cashHeads = await AccountHead.find({ code: { $in: ['11001', '11002'] } });
      const cashHeadIds = cashHeads.map((h) => h._id);

      if (cashHeadIds.length === 0) {
        throw new Error("Cash account heads (codes 11001/11002) not found in system.");
      }

      // 1. Calculate Opening Balance
      const opMatch = {
        accountHeadId: { $in: cashHeadIds },
        entryDate: { $lt: sDate },
      };
      if (branchId) {
        opMatch.branchId = new mongoose.Types.ObjectId(branchId);
      }

      const opAgg = await LedgerEntry.aggregate([
        { $match: opMatch },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$debitAmount' },
            totalCredit: { $sum: '$creditAmount' },
          },
        },
      ]);
      const openingCash = opAgg.length > 0 ? (opAgg[0].totalDebit - opAgg[0].totalCredit) : 0;

      // 2. Query all cash entries during the period
      const periodMatch = {
        accountHeadId: { $in: cashHeadIds },
        entryDate: { $gte: sDate, $lte: eDate },
      };
      if (branchId) {
        periodMatch.branchId = new mongoose.Types.ObjectId(branchId);
      }

      const cashPostings = await LedgerEntry.find(periodMatch).populate('accountHeadId');

      let depositsInflow = 0;
      let loanCollectionsInflow = 0;
      let feesInflow = 0;
      let otherInflow = 0;

      let withdrawalsOutflow = 0;
      let loanDisbursementsOutflow = 0;
      let expensesOutflow = 0;
      let otherOutflow = 0;

      // For classification, retrieve the balancing accounts in each voucher
      const voucherIds = [...new Set(cashPostings.map((p) => p.voucherId.toString()))];
      const voucherLinesMap = {};

      if (voucherIds.length > 0) {
        const balancingLines = await LedgerEntry.find({
          voucherId: { $in: voucherIds },
          accountHeadId: { $notin: cashHeadIds },
        }).populate('accountHeadId');

        balancingLines.forEach((line) => {
          const vId = line.voucherId.toString();
          if (!voucherLinesMap[vId]) voucherLinesMap[vId] = [];
          voucherLinesMap[vId].push(line);
        });
      }

      cashPostings.forEach((post) => {
        const vId = post.voucherId.toString();
        const matches = voucherLinesMap[vId] || [];
        const isDebit = post.debitAmount > 0;
        const amount = isDebit ? post.debitAmount : post.creditAmount;

        // Classify based on the balancing ledger entry's AccountHead type or code
        let category = 'OTHER';
        if (matches.length > 0) {
          // Check for deposits liability account heads
          const hasDeposit = matches.some((m) => m.accountHeadId.code?.startsWith('2100'));
          const hasLoan = matches.some((m) => m.accountHeadId.code?.startsWith('1200'));
          const hasIncome = matches.some((m) => m.accountHeadId.code?.startsWith('4100') || m.accountHeadId.type === 'INCOME');
          const hasExpense = matches.some((m) => m.accountHeadId.code?.startsWith('5100') || m.accountHeadId.type === 'EXPENSE');

          if (hasDeposit) category = 'DEPOSIT';
          else if (hasLoan) category = 'LOAN';
          else if (hasIncome) category = 'FEES';
          else if (hasExpense) category = 'EXPENSE';
        }

        if (isDebit) {
          // Cash Inflow
          if (category === 'DEPOSIT') depositsInflow += amount;
          else if (category === 'LOAN') loanCollectionsInflow += amount;
          else if (category === 'FEES') feesInflow += amount;
          else otherInflow += amount;
        } else {
          // Cash Outflow
          if (category === 'DEPOSIT') withdrawalsOutflow += amount;
          else if (category === 'LOAN') loanDisbursementsOutflow += amount;
          else if (category === 'EXPENSE') expensesOutflow += amount;
          else otherOutflow += amount;
        }
      });

      const totalInflow = depositsInflow + loanCollectionsInflow + feesInflow + otherInflow;
      const totalOutflow = withdrawalsOutflow + loanDisbursementsOutflow + expensesOutflow + otherOutflow;
      const closingCash = openingCash + totalInflow - totalOutflow;

      return {
        openingCash: Math.round(openingCash * 100) / 100,
        inflows: {
          deposits: Math.round(depositsInflow * 100) / 100,
          loanCollections: Math.round(loanCollectionsInflow * 100) / 100,
          fees: Math.round(feesInflow * 100) / 100,
          other: Math.round(otherInflow * 100) / 100,
        },
        outflows: {
          withdrawals: Math.round(withdrawalsOutflow * 100) / 100,
          loanDisbursements: Math.round(loanDisbursementsOutflow * 100) / 100,
          expenses: Math.round(expensesOutflow * 100) / 100,
          other: Math.round(otherOutflow * 100) / 100,
        },
        totalInflow: Math.round(totalInflow * 100) / 100,
        totalOutflow: Math.round(totalOutflow * 100) / 100,
        closingCash: Math.round(closingCash * 100) / 100,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw AppError.validation(`Failed to generate Cash Flow: ${error.message}`);
    }
  }
}

const financialReportServiceInstance = new FinancialReportService();
export default financialReportServiceInstance;
export { financialReportServiceInstance as FinancialReportServiceInstance };
