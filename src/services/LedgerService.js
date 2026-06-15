import BaseService from './BaseService.js';
import journalVoucherRepository from '../repositories/JournalVoucherRepository.js';
import ledgerEntryRepository from '../repositories/LedgerEntryRepository.js';
import accountHeadRepository from '../repositories/AccountHeadRepository.js';
import sequenceService from './SequenceService.js';
import accountingRulesService from './AccountingRulesService.js';
import { createVoucherSchema } from '../schemas/journal-voucher.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LedgerService extends BaseService {
  constructor() {
    super(journalVoucherRepository);
  }

  /**
   * Create a double-entry Journal Voucher and its associated Ledger Entries.
   *
   * @param {Object} data - Voucher and entries data
   * @param {string} userId - Creator User ID
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<import('mongoose').Document>} The created Journal Voucher
   */
  async createVoucher(data, userId, session = null) {
    const internalSession = session || (await mongoose.startSession());
    if (!session) {
      internalSession.startTransaction();
    }

    try {
      // Validate schema (includes double-entry check)
      const validatedData = this.validate(createVoucherSchema, data);

      // Enforce Business Date Lock
      const Branch = mongoose.model('Branch');
      const branchDoc = await Branch.findById(validatedData.branchId).session(internalSession);
      if (branchDoc && branchDoc.currentBusinessDate) {
        const vDate = new Date(validatedData.voucherDate || new Date());
        const vDateOnly = new Date(vDate.getFullYear(), vDate.getMonth(), vDate.getDate());
        const bDateOnly = new Date(branchDoc.currentBusinessDate.getFullYear(), branchDoc.currentBusinessDate.getMonth(), branchDoc.currentBusinessDate.getDate());
        if (vDateOnly < bDateOnly) {
          throw AppError.validation(`Cannot post transactions for a closed or locked business date (${vDateOnly.toLocaleDateString()}). Current active business date is ${bDateOnly.toLocaleDateString()}.`);
        }
      }

      // Generate voucher number atomically
      const voucherNo = await sequenceService.generateVoucherNo(validatedData.branchId, internalSession);

      // Create voucher header
      const voucherDoc = await this.repository.create(
        {
          voucherNo,
          voucherDate: validatedData.voucherDate || new Date(),
          voucherType: validatedData.voucherType,
          branchId: validatedData.branchId,
          narration: validatedData.narration,
          createdBy: userId,
          updatedBy: userId,
          status: 'ACTIVE',
        },
        { session: internalSession }
      );

      // Insert ledger lines and calculate running balances
      const ledgerLines = [];
      const accountHeads = {};
      
      for (const entry of validatedData.entries) {
        let ah = accountHeads[entry.accountHeadId.toString()];
        if (!ah) {
          ah = await mongoose.model('AccountHead').findById(entry.accountHeadId).session(internalSession);
          if (ah) {
            accountHeads[entry.accountHeadId.toString()] = ah;
          }
        }
        const type = ah ? ah.type : 'ASSET';
        
        // Find latest ledger entry (including in-memory postings within this voucher)
        const sameHeadInLoop = ledgerLines.filter(line => line.accountHeadId.toString() === entry.accountHeadId.toString());
        let previousBalance = 0;
        if (sameHeadInLoop.length > 0) {
          previousBalance = sameHeadInLoop[sameHeadInLoop.length - 1].balanceAfterTransaction;
        } else {
          const lastEntry = await ledgerEntryRepository.model.findOne({
            accountHeadId: entry.accountHeadId,
            branchId: voucherDoc.branchId
          })
          .sort({ entryDate: -1, createdAt: -1 })
          .session(internalSession);
          previousBalance = lastEntry ? lastEntry.balanceAfterTransaction : 0;
        }

        const isAssetOrExpense = ['ASSET', 'EXPENSE'].includes(type);
        const debitAmt = entry.debit || 0;
        const creditAmt = entry.credit || 0;
        
        let balanceAfterTransaction = previousBalance;
        if (isAssetOrExpense) {
          balanceAfterTransaction = previousBalance + debitAmt - creditAmt;
        } else {
          balanceAfterTransaction = previousBalance + creditAmt - debitAmt;
        }

        ledgerLines.push({
          voucherId: voucherDoc._id,
          accountHeadId: entry.accountHeadId,
          entryDate: voucherDoc.voucherDate,
          debit: debitAmt,
          credit: creditAmt,
          debitAmount: debitAmt,
          creditAmount: creditAmt,
          balanceAfterTransaction,
          transactionDate: voucherDoc.voucherDate,
          branchId: voucherDoc.branchId,
          memberId: entry.memberId || null,
          narration: entry.narration || voucherDoc.narration,
          createdBy: userId,
        });
      }

      await ledgerEntryRepository.model.insertMany(ledgerLines, { session: internalSession });

      if (!session) {
        await internalSession.commitTransaction();
        internalSession.endSession();
      }

      return voucherDoc;
    } catch (error) {
      if (!session) {
        await internalSession.abortTransaction();
        internalSession.endSession();
      }
      this.handleError(error, 'Failed to create journal voucher');
    }
  }

  /**
   * Post double-entry postings for a Transaction.
   *
   * @param {import('mongoose').Document} transaction - Transaction document
   * @param {string} userId - Operator User ID
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<import('mongoose').Document>} Journal Voucher posted
   */
  async postTransaction(transaction, userId, session = null) {
    try {
      const rule = accountingRulesService.getRule(transaction.transactionType);
      if (!rule) {
        throw AppError.validation(`No accounting mapping rule defined for transaction type: ${transaction.transactionType}`);
      }

      // Fetch account heads
      const entries = [];

      // 1. Resolve Debit Head
      const debitCode = rule.debitCode;
      const debitHead = await accountHeadRepository.findOne({ code: debitCode });
      if (!debitHead) {
        throw AppError.notFound(`Debit Account Head code ${debitCode} not found in Chart of Accounts.`);
      }

      // 2. Resolve Credit Head(s)
      if (transaction.transactionType === 'LOAN_INSTALLMENT' && rule.creditCodes) {
        // Loan installment may have principal and interest split
        // Check if transaction amount contains split metadata
        let principal = transaction.amount;
        let interest = 0;
        
        // We will read optional split from transaction's narration or custom metadata
        // For standard processing, if we have custom split fields, use them, otherwise 100% principal
        const meta = transaction.narration && transaction.narration.includes('Principal:')
          ? parseNarrationSplit(transaction.narration)
          : null;
        
        if (meta) {
          principal = meta.principal;
          interest = meta.interest;
        }

        // Debit cash
        entries.push({
          accountHeadId: debitHead._id,
          debit: transaction.amount,
          credit: 0,
          memberId: transaction.memberId,
          narration: transaction.narration,
        });

        // Credit Principal
        if (principal > 0) {
          const principalHead = await accountHeadRepository.findOne({ code: rule.creditCodes.principal });
          if (!principalHead) {
            throw AppError.notFound(`Principal Credit Head code ${rule.creditCodes.principal} not found.`);
          }
          entries.push({
            accountHeadId: principalHead._id,
            debit: 0,
            credit: principal,
            memberId: transaction.memberId,
            narration: `${transaction.narration || ''} (Principal Repayment)`.trim(),
          });
        }

        // Credit Interest
        if (interest > 0) {
          const interestHead = await accountHeadRepository.findOne({ code: rule.creditCodes.interest });
          if (!interestHead) {
            throw AppError.notFound(`Interest Credit Head code ${rule.creditCodes.interest} not found.`);
          }
          entries.push({
            accountHeadId: interestHead._id,
            debit: 0,
            credit: interest,
            memberId: transaction.memberId,
            narration: `${transaction.narration || ''} (Interest Component)`.trim(),
          });
        }
      } else {
        // Standard single debit, single credit posting
        const creditHead = await accountHeadRepository.findOne({ code: rule.creditCode });
        if (!creditHead) {
          throw AppError.notFound(`Credit Account Head code ${rule.creditCode} not found in Chart of Accounts.`);
        }

        entries.push(
          {
            accountHeadId: debitHead._id,
            debit: transaction.amount,
            credit: 0,
            memberId: transaction.memberId,
            narration: transaction.narration,
          },
          {
            accountHeadId: creditHead._id,
            debit: 0,
            credit: transaction.amount,
            memberId: transaction.memberId,
            narration: transaction.narration,
          }
        );
      }

      const voucherPayload = {
        voucherDate: transaction.approvedAt || new Date(),
        voucherType: transaction.paymentMode === 'CASH' ? 'RECEIPT' : 'JOURNAL',
        branchId: transaction.branchId,
        narration: `Transaction Posting: ${transaction.transactionNo} - ${transaction.narration || ''}`,
        entries,
      };

      // Set the transactionId in each entry during creation.
      // We will create the voucher, and then update the ledger lines transactionId reference.
      const voucher = await this.createVoucher(voucherPayload, userId, session);

      // Link ledger entries to transaction
      await ledgerEntryRepository.model.updateMany(
        { voucherId: voucher._id },
        { $set: { transactionId: transaction._id } },
        { session }
      );

      return voucher;
    } catch (error) {
      this.handleError(error, 'Failed to post transaction entries');
    }
  }

  /**
   * Reverse postings of a voucher (compensating entries).
   *
   * @param {string} originalVoucherId - Original voucher ID
   * @param {string} userId - operator ID
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<import('mongoose').Document>} Reversal Voucher posted
   */
  async reversePosting(originalVoucherId, userId, session = null) {
    try {
      const originalVoucher = await this.repository.findById(originalVoucherId);
      if (!originalVoucher) {
        throw AppError.notFound('Original voucher not found');
      }

      const lines = await ledgerEntryRepository.model.find({ voucherId: originalVoucherId }).session(session).exec();
      if (!lines.length) {
        throw AppError.notFound('No ledger entry lines found for original voucher');
      }

      // Create compensating entries by swapping debit and credit
      const reversedEntries = lines.map((line) => ({
        accountHeadId: line.accountHeadId,
        debit: line.credit, // swap
        credit: line.debit, // swap
        memberId: line.memberId,
        narration: `REVERSAL of ${originalVoucher.voucherNo} - ${line.narration || ''}`,
      }));

      const voucherPayload = {
        voucherDate: new Date(),
        voucherType: 'JOURNAL',
        branchId: originalVoucher.branchId,
        narration: `Compensating reversal voucher for: ${originalVoucher.voucherNo}`,
        entries: reversedEntries,
      };

      return await this.createVoucher(voucherPayload, userId, session);
    } catch (error) {
      this.handleError(error, 'Failed to post compensating reversal entries');
    }
  }

  /**
   * Fetch paginated ledger entries.
   *
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} docs and pagination summary
   */
  async getLedgerEntries(filters = {}, options = {}) {
    try {
      return await ledgerEntryRepository.findMany(filters, {
        populate: ['accountHeadId', 'branchId', 'voucherId'],
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to fetch ledger entries');
    }
  }
}

// Helper to parse principal and interest split from narration
function parseNarrationSplit(narration) {
  try {
    // Expected format: Principal: 5000, Interest: 200
    const principalMatch = narration.match(/Principal:\s*([\d.]+)/);
    const interestMatch = narration.match(/Interest:\s*([\d.]+)/);
    if (principalMatch && interestMatch) {
      return {
        principal: parseFloat(principalMatch[1]),
        interest: parseFloat(interestMatch[1]),
      };
    }
  } catch (e) {
    // Ignore split parse errors and default
  }
  return null;
}

const ledgerServiceInstance = new LedgerService();
export default ledgerServiceInstance;
export { ledgerServiceInstance as LedgerServiceInstance };
