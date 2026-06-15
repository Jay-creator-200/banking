import mongoose from 'mongoose';
import BankReconciliation from '../models/BankReconciliation.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Transaction from '../models/Transaction.js';
import CashSession from '../models/CashSession.js';
import auditLogService from './AuditLogService.js';
import { AppError } from '../utils/error-handler.js';

export class ReconciliationService {
  /**
   * Upload and process a bank statement, executing auto-matching heuristics
   */
  async uploadStatement({ bankAccount, statementDate, openingBalance, closingBalance, csvRows, userId }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const parsedTransactions = [];

      // Find Bank GL Account Head (code 11002 - Cash at Bank)
      const bankHead = await mongoose.model('AccountHead').findOne({ code: '11002' }).session(session);
      if (!bankHead) {
        throw AppError.notFound("Bank Account Head (code 11002) not found in Chart of Accounts");
      }

      for (const row of csvRows) {
        const txDate = new Date(row.date);
        const debitAmt = parseFloat(row.debit || '0');
        const creditAmt = parseFloat(row.credit || '0');

        // Auto-match check:
        // Bank debit = System Credit
        // Bank credit = System Debit
        // Range: Date +- 3 days
        const startRange = new Date(txDate);
        startRange.setDate(startRange.getDate() - 3);
        const endRange = new Date(txDate);
        endRange.setDate(endRange.getDate() + 3);

        const query = {
          accountHeadId: bankHead._id,
          debitAmount: creditAmt, // Swap debit/credit for bank vs ledger
          creditAmount: debitAmt,
          entryDate: { $gte: startRange, $lte: endRange },
          transactionId: { $ne: null },
        };

        const matchedLedger = await LedgerEntry.findOne(query).session(session);

        parsedTransactions.push({
          date: txDate,
          description: row.description || 'Bank transaction',
          refNo: row.refNo || '',
          debit: debitAmt,
          credit: creditAmt,
          status: matchedLedger ? 'Matched' : 'Unmatched',
          systemTransactionId: matchedLedger ? matchedLedger.transactionId : null,
          matchedAt: matchedLedger ? new Date() : null,
          matchedBy: matchedLedger ? 'SYSTEM' : null,
        });
      }

      const reconciliation = await BankReconciliation.create(
        [
          {
            bankAccount,
            statementDate: new Date(statementDate),
            openingBalance,
            closingBalance,
            transactions: parsedTransactions,
            createdBy: userId,
            updatedBy: userId,
          },
        ],
        { session }
      );

      // Log Audit Event
      await auditLogService.logAction(
        userId,
        'RECONCILIATION',
        'RECONCILIATION_COMPLETED',
        'BankReconciliation',
        reconciliation[0]._id,
        null,
        { bankAccount, statementDate }
      );

      await session.commitTransaction();
      session.endSession();

      return reconciliation[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Manually match a bank transaction line to a system transaction
   */
  async manualMatch({ reconciliationId, statementLineId, systemTransactionId, userId }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const recon = await BankReconciliation.findById(reconciliationId).session(session);
      if (!recon) {
        throw AppError.notFound('Bank Reconciliation record not found');
      }

      // Check if system transaction exists
      const sysTx = await Transaction.findById(systemTransactionId).session(session);
      if (!sysTx) {
        throw AppError.notFound('System transaction not found');
      }

      // Find transaction line inside embed
      const line = recon.transactions.id(statementLineId);
      if (!line) {
        throw AppError.notFound('Statement line item not found');
      }

      line.status = 'Matched';
      line.systemTransactionId = systemTransactionId;
      line.matchedAt = new Date();
      line.matchedBy = userId;

      await recon.save({ session });

      // Log Audit Event
      await auditLogService.logAction(
        userId,
        'RECONCILIATION',
        'RECONCILIATION_MATCHED_MANUALLY',
        'BankReconciliation',
        reconciliationId,
        { statementLineId },
        { systemTransactionId }
      );

      await session.commitTransaction();
      session.endSession();

      return recon;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Cash reconciliation with teller sessions
   */
  async getCashReconciliationReport({ branchId, date }) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch cash sessions for branch on date
      const sessions = await CashSession.find({
        branchId,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
      }).populate('userId');

      let expectedCashTotal = 0;
      let physicalCashTotal = 0;
      let totalDifference = 0;
      const sessionSummaries = [];

      sessions.forEach((s) => {
        expectedCashTotal += s.systemBalance;
        physicalCashTotal += s.physicalBalance;
        totalDifference += s.differenceAmount;

        sessionSummaries.push({
          sessionNo: s.sessionNo,
          tellerName: s.userId ? s.userId.fullName : 'Unknown Teller',
          status: s.status,
          expectedCash: s.systemBalance,
          physicalCash: s.physicalBalance,
          difference: s.differenceAmount,
          remarks: s.remarks,
        });
      });

      return {
        date: targetDate,
        branchId,
        expectedCashTotal: Math.round(expectedCashTotal * 100) / 100,
        physicalCashTotal: Math.round(physicalCashTotal * 100) / 100,
        totalDifference: Math.round(totalDifference * 100) / 100,
        status: totalDifference === 0 ? 'RECONCILED' : 'DISCREPANCY',
        sessions: sessionSummaries,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw AppError.validation(`Failed to generate Cash Reconciliation: ${error.message}`);
    }
  }
}

const reconciliationServiceInstance = new ReconciliationService();
export default reconciliationServiceInstance;
export { reconciliationServiceInstance as ReconciliationServiceInstance };
