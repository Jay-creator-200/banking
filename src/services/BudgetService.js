import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AccountHead from '../models/AccountHead.js';
import auditLogService from './AuditLogService.js';
import { AppError } from '../utils/error-handler.js';

export class BudgetService {
  /**
   * Helper to parse Indian Fiscal Year string (e.g. "2026-2027" -> April 1, 2026 to March 31, 2027)
   */
  _parseFiscalYearDates(fiscalYear) {
    try {
      const parts = fiscalYear.split('-');
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);
      
      const startDate = new Date(startYear, 3, 1, 0, 0, 0, 0); // April 1
      const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31
      return { startDate, endDate };
    } catch (e) {
      // Default fallback
      return {
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
      };
    }
  }

  /**
   * Upsert a budget allocation record
   */
  async updateBudget(data, userId) {
    try {
      const { fiscalYear, branchId, department, accountHeadId, allocatedAmount } = data;

      const budget = await Budget.findOneAndUpdate(
        { fiscalYear, branchId, department, accountHeadId },
        { allocatedAmount, updatedBy: userId, createdBy: userId },
        { upsert: true, new: true }
      );

      // Log Audit Event
      await auditLogService.logAction(
        userId,
        'BUDGET',
        'BUDGET_UPDATED',
        'Budget',
        budget._id,
        null,
        { fiscalYear, department, allocatedAmount }
      );

      return budget;
    } catch (error) {
      throw AppError.validation(`Failed to update budget: ${error.message}`);
    }
  }

  /**
   * Compare Budget vs Actual performance
   */
  async getBudgetReport({ branchId, fiscalYear }) {
    try {
      const query = { fiscalYear };
      if (branchId) query.branchId = branchId;

      const budgets = await Budget.find(query).populate('accountHeadId').populate('branchId');
      const { startDate, endDate } = this._parseFiscalYearDates(fiscalYear);

      const comparisonReport = [];

      for (const b of budgets) {
        const head = b.accountHeadId;
        if (!head) continue;

        // Fetch all ledger entry postings for this account head in the branch & fiscal year
        const match = {
          accountHeadId: head._id,
          entryDate: { $gte: startDate, $lte: endDate },
        };
        if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

        const agg = await LedgerEntry.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              debits: { $sum: '$debitAmount' },
              credits: { $sum: '$creditAmount' },
            },
          },
        ]);

        let actualAmount = 0;
        const debits = agg.length > 0 ? agg[0].debits : 0;
        const credits = agg.length > 0 ? agg[0].credits : 0;

        if (head.type === 'INCOME') {
          actualAmount = credits - debits; // income increases with credits
        } else if (head.type === 'EXPENSE') {
          actualAmount = debits - credits; // expense increases with debits
        } else {
          actualAmount = debits - credits;
        }

        actualAmount = Math.max(0, Math.round(actualAmount * 100) / 100);
        const allocated = b.allocatedAmount;
        const variance = Math.round((allocated - actualAmount) * 100) / 100;
        const utilization = allocated > 0 ? Math.round((actualAmount / allocated) * 10000) / 100 : 0;

        comparisonReport.push({
          budgetId: b._id,
          branchName: b.branchId ? b.branchId.branchName : 'Global',
          department: b.department,
          accountName: head.name,
          accountCode: head.code,
          accountType: head.type,
          allocatedAmount: allocated,
          actualAmount,
          variance,
          utilizationPercentage: utilization,
        });
      }

      return {
        fiscalYear,
        startDate,
        endDate,
        comparison: comparisonReport,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw AppError.validation(`Failed to generate budget report: ${error.message}`);
    }
  }
}

const budgetServiceInstance = new BudgetService();
export default budgetServiceInstance;
export { budgetServiceInstance as BudgetServiceInstance };
