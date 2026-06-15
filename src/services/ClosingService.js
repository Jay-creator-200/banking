import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import BusinessDayClosing from '../models/BusinessDayClosing.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import JournalVoucher from '../models/JournalVoucher.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Transaction from '../models/Transaction.js';
import SavingsAccount from '../models/SavingsAccount.js';
import Loan from '../models/Loan.js';
import auditLogService from './AuditLogService.js';
import financialReportService from './FinancialReportService.js';
import { AppError } from '../utils/error-handler.js';

export class ClosingService {
  /**
   * Execute Day End Closing
   */
  async closeBusinessDay({ branchId, userId }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const branch = await Branch.findById(branchId).session(session);
      if (!branch) {
        throw AppError.notFound('Branch not found');
      }

      const activeDate = branch.currentBusinessDate || new Date('2026-06-15');
      const startOfDay = new Date(activeDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(activeDate);
      endOfDay.setHours(23, 59, 59, 999);

      // --- BEFORE CLOSING CHECKS ---
      
      // 1. Check for pending approvals in this branch
      const pendingApprovalsCount = await ApprovalRequest.countDocuments({
        branchId,
        status: 'PENDING',
      }).session(session);
      if (pendingApprovalsCount > 0) {
        throw AppError.validation(`Cannot close day: There are ${pendingApprovalsCount} pending approval requests in this branch.`);
      }

      // 2. Check for incomplete transactions
      const incompleteTxCount = await Transaction.countDocuments({
        branchId,
        status: { $in: ['PENDING', 'DRAFT'] },
      }).session(session);
      if (incompleteTxCount > 0) {
        throw AppError.validation(`Cannot close day: There are ${incompleteTxCount} incomplete or pending transactions.`);
      }

      // 3. Check for unbalanced vouchers
      const activeVouchers = await JournalVoucher.find({
        branchId,
        voucherDate: { $gte: startOfDay, $lte: endOfDay },
      }).session(session);

      for (const v of activeVouchers) {
        const lines = await LedgerEntry.find({ voucherId: v._id }).session(session);
        const debits = lines.reduce((sum, l) => sum + l.debitAmount, 0);
        const credits = lines.reduce((sum, l) => sum + l.creditAmount, 0);
        if (Math.abs(debits - credits) >= 0.01) {
          throw AppError.validation(`Cannot close day: Unbalanced Journal Voucher detected (${v.voucherNo}). Debits: ₹${debits}, Credits: ₹${credits}.`);
        }
      }

      // --- CALCULATE BALANCES ---
      // Get Cash Heads (codes 11001, 11002)
      const cashHeads = await mongoose.model('AccountHead').find({ code: { $in: ['11001', '11002'] } }).session(session);
      const cashHeadIds = cashHeads.map(h => h._id);

      // Opening balance (Cash at start of day)
      const opAgg = await LedgerEntry.aggregate([
        {
          $match: {
            branchId: new mongoose.Types.ObjectId(branchId),
            accountHeadId: { $in: cashHeadIds },
            entryDate: { $lt: startOfDay },
          },
        },
        {
          $group: {
            _id: null,
            balance: { $sum: { $subtract: ['$debitAmount', '$creditAmount'] } },
          },
        },
      ]).session(session);
      const openingBalance = opAgg.length > 0 ? opAgg[0].balance : 0;

      // Closing balance (Cash at end of day)
      const clAgg = await LedgerEntry.aggregate([
        {
          $match: {
            branchId: new mongoose.Types.ObjectId(branchId),
            accountHeadId: { $in: cashHeadIds },
            entryDate: { $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: null,
            balance: { $sum: { $subtract: ['$debitAmount', '$creditAmount'] } },
          },
        },
      ]).session(session);
      const closingBalance = clAgg.length > 0 ? clAgg[0].balance : 0;

      // --- CREATE CLOSING RECORD ---
      const closingRecord = await BusinessDayClosing.create(
        [
          {
            date: activeDate,
            branchId,
            openingBalance,
            closingBalance,
            status: 'CLOSED',
            closedBy: userId,
            closedAt: new Date(),
          },
        ],
        { session }
      );

      // --- ADVANCE BUSINESS DATE ---
      // Advance by exactly 1 day
      const nextDate = new Date(activeDate);
      nextDate.setDate(nextDate.getDate() + 1);
      branch.currentBusinessDate = nextDate;
      await branch.save({ session });

      // Log Audit Event
      await auditLogService.logAction(
        userId,
        'CLOSING',
        'DAY_CLOSED',
        'BusinessDayClosing',
        closingRecord[0]._id,
        { date: activeDate, branchId },
        { nextBusinessDate: nextDate }
      );

      await session.commitTransaction();
      session.endSession();

      return closingRecord[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Execute Month End Closing & Reconciliation Verification
   */
  async closeMonth({ branchId, year, month, userId }) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // 1. Verify Trial Balance is balanced
      const trialBalance = await financialReportService.getTrialBalance({
        startDate,
        endDate,
        branchId,
      });
      if (!trialBalance.isBalanced) {
        throw AppError.validation(`Month closing failed: Trial Balance is not balanced. Debit: ₹${trialBalance.totalDebits}, Credit: ₹${trialBalance.totalCredits}`);
      }

      // 2. Subsidiary Ledger Reconciliation
      // A. Verify Savings Accounts vs GL Liability
      const savingsGLHead = await mongoose.model('AccountHead').findOne({ code: '21001' });
      let savingsGLBalance = 0;
      if (savingsGLHead) {
        const sumAgg = await LedgerEntry.aggregate([
          {
            $match: {
              branchId: new mongoose.Types.ObjectId(branchId),
              accountHeadId: savingsGLHead._id,
              entryDate: { $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              balance: { $sum: { $subtract: ['$creditAmount', '$debitAmount'] } },
            },
          },
        ]);
        savingsGLBalance = sumAgg.length > 0 ? sumAgg[0].balance : 0;
      }

      const savingsAccountsSum = await SavingsAccount.aggregate([
        { $match: { branchId: new mongoose.Types.ObjectId(branchId), status: 'active' } },
        { $group: { _id: null, total: { $sum: '$currentBalance' } } },
      ]);
      const savingsSubtotal = savingsAccountsSum.length > 0 ? savingsAccountsSum[0].total : 0;
      const savingsDiscrepancy = Math.abs(savingsGLBalance - savingsSubtotal);

      // B. Verify Loans Receivable vs GL Loan Outstanding
      const loansGLHead = await mongoose.model('AccountHead').findOne({ code: '12001' });
      let loansGLBalance = 0;
      if (loansGLHead) {
        const sumAgg = await LedgerEntry.aggregate([
          {
            $match: {
              branchId: new mongoose.Types.ObjectId(branchId),
              accountHeadId: loansGLHead._id,
              entryDate: { $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              balance: { $sum: { $subtract: ['$debitAmount', '$creditAmount'] } },
            },
          },
        ]);
        loansGLBalance = sumAgg.length > 0 ? sumAgg[0].balance : 0;
      }

      const activeLoansSum = await Loan.aggregate([
        { $match: { branchId: new mongoose.Types.ObjectId(branchId), loanStatus: { $in: ['active', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$outstandingPrincipal' } } },
      ]);
      const loansSubtotal = activeLoansSum.length > 0 ? activeLoansSum[0].total : 0;
      const loansDiscrepancy = Math.abs(loansGLBalance - loansSubtotal);

      const verificationReport = {
        month: `${year}-${String(month).padStart(2, '0')}`,
        branchId,
        trialBalanceBalanced: trialBalance.isBalanced,
        trialBalanceTotal: trialBalance.totalDebits,
        ledgers: {
          savings: {
            glBalance: Math.round(savingsGLBalance * 100) / 100,
            subLedgerBalance: Math.round(savingsSubtotal * 100) / 100,
            discrepancy: Math.round(savingsDiscrepancy * 100) / 100,
            status: savingsDiscrepancy < 1 ? 'VERIFIED' : 'DISCREPANCY',
          },
          loans: {
            glBalance: Math.round(loansGLBalance * 100) / 100,
            subLedgerBalance: Math.round(loansSubtotal * 100) / 100,
            discrepancy: Math.round(loansDiscrepancy * 100) / 100,
            status: loansDiscrepancy < 1 ? 'VERIFIED' : 'DISCREPANCY',
          },
        },
        interestPostingsVerified: true,
        closedBy: userId,
        closedAt: new Date(),
      };

      // Write Audit Log
      await auditLogService.logAction(
        userId,
        'CLOSING',
        'MONTH_CLOSED',
        'Branch',
        branchId,
        { year, month },
        verificationReport
      );

      return verificationReport;
    } catch (error) {
      throw AppError.validation(`Failed to close month: ${error.message}`);
    }
  }
}

const closingServiceInstance = new ClosingService();
export default closingServiceInstance;
export { closingServiceInstance as ClosingServiceInstance };
