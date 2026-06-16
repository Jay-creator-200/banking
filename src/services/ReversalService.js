import BaseService from './BaseService.js';
import transactionReversalRepository from '../repositories/TransactionReversalRepository.js';
import transactionRepository from '../repositories/TransactionRepository.js';
import approvalService from './ApprovalService.js';
import sequenceService from './SequenceService.js';
import ledgerService from './LedgerService.js';
import ledgerEntryRepository from '../repositories/LedgerEntryRepository.js';
import auditLogService from './AuditLogService.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class ReversalService extends BaseService {
  constructor() {
    super(transactionReversalRepository);
  }

  /**
   * Request a reversal for a posted transaction.
   *
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Reason for reversal
   * @param {string} userId - Requesting user
   * @returns {Promise<import('mongoose').Document>} Reversal request document
   */
  async requestReversal(transactionId, reason, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!reason || !reason.trim()) {
        throw AppError.validation('Reversal reason is required');
      }

      const transaction = await transactionRepository.findById(transactionId);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'POSTED') {
        throw AppError.validation(`Only POSTED transactions can be reversed. Current status: ${transaction.status}`);
      }

      // Check if there is already a pending reversal request for this transaction
      const existingPending = await this.repository.findOne({
        transactionId,
        status: 'PENDING',
      });
      if (existingPending) {
        throw AppError.conflict('A pending reversal request already exists for this transaction.');
      }

      // Create Reversal request record
      const reversalDoc = await this.repository.create(
        {
          transactionId,
          reason,
          requestedBy: userId,
          status: 'PENDING',
        },
        { session }
      );

      const User = mongoose.model('User');
      const requester = await User.findById(userId).populate('roleId').session(session);
      const isSuperAdmin = requester?.roleId?.code === 'SUPER_ADMIN';

      if (isSuperAdmin) {
        // Direct reversal auto-approval bypass
        await this.approveReversal(reversalDoc._id, userId, session);
      } else {
        // Create Approval workflow record
        await approvalService.createApproval(
          {
            moduleName: 'REVERSAL',
            referenceCollection: 'TransactionReversal',
            referenceId: reversalDoc._id,
            requestType: 'REVERSAL',
          },
          userId,
          session
        );
      }

      await session.commitTransaction();
      session.endSession();

      // Return the updated document from the database (refetched after posting changes)
      const finalReversal = await this.repository.model.findById(reversalDoc._id);
      return finalReversal || reversalDoc;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to request transaction reversal');
    }
  }

  /**
   * Approve a reversal request (called via approval queue callback).
   * Reverses the GL entries AND the affected module sub-ledger balances
   * inside a single atomic MongoDB session.
   *
   * @param {string} reversalId - Reversal request ID
   * @param {string} userId - Approver ID
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Approved reversal request
   */
  async approveReversal(reversalId, userId, session) {
    try {
      const reversal = await this.repository.model.findById(reversalId).session(session);
      if (!reversal) {
        throw AppError.notFound('Reversal request not found');
      }
      if (reversal.status !== 'PENDING') {
        throw AppError.validation('Reversal request is already processed');
      }

      const transaction = await transactionRepository.model.findById(reversal.transactionId).session(session);
      if (!transaction) {
        throw AppError.notFound('Original transaction not found');
      }
      if (transaction.status !== 'POSTED') {
        throw AppError.validation('Original transaction is not in POSTED state');
      }

      // Find original Journal Voucher associated with the transaction
      const origLedgerEntry = await ledgerEntryRepository.model
        .findOne({ transactionId: transaction._id })
        .session(session)
        .exec();
        
      if (!origLedgerEntry) {
        throw AppError.notFound('No postings found for the original transaction to reverse');
      }

      // Create Compensating Reversal Transaction in DB
      const reversalTxnNo = await sequenceService.generateTransactionNo(transaction.branchId, session);
      const compensatingTxn = await transactionRepository.create(
        {
          transactionNo: reversalTxnNo,
          branchId: transaction.branchId,
          memberId: transaction.memberId,
          accountType: transaction.accountType,
          accountId: transaction.accountId,
          transactionType: transaction.transactionType,
          paymentMode: transaction.paymentMode,
          amount: transaction.amount,
          referenceNo: transaction.transactionNo,
          narration: `REVERSAL compensating entry: ${reversal.reason}`,
          status: 'POSTED',
          createdBy: userId,
          approvedBy: userId,
          approvedAt: new Date(),
        },
        { session }
      );

      // Post Reversing Ledger Entries (Compensating Journal Voucher)
      const reversalVoucher = await ledgerService.reversePosting(origLedgerEntry.voucherId, userId, session);

      // Link compensating ledger entries to compensating transaction
      await ledgerEntryRepository.model.updateMany(
        { voucherId: reversalVoucher._id },
        { $set: { transactionId: compensatingTxn._id } },
        { session }
      );

      // ----------------------------------------------------------------
      // SUB-LEDGER CORRECTION — restore affected module balances
      // ----------------------------------------------------------------
      await this._reverseModuleSubLedger(transaction, userId, session, reversal.reason);
      // ----------------------------------------------------------------

      // Update original transaction status to REVERSED
      transaction.status = 'REVERSED';
      transaction.updatedBy = userId;
      await transaction.save({ session });

      // Update reversal request status
      reversal.status = 'APPROVED';
      reversal.approvedBy = userId;
      reversal.approvedAt = new Date();
      reversal.reversalTransactionId = compensatingTxn._id;
      await reversal.save({ session });

      await auditLogService.log({
        userId,
        action: 'REVERSAL_APPROVED',
        module: 'REVERSAL',
        entityId: reversal._id.toString(),
        description: `Reversal approved for Txn ${transaction.transactionNo}. Compensating Txn: ${reversalTxnNo}. Module balances adjusted.`,
      });

      return reversal;
    } catch (error) {
      this.handleError(error, 'Failed to approve transaction reversal');
    }
  }

  /**
   * Reverse the module-level sub-ledger balance that was changed
   * when the original transaction was approved.
   *
   * Each case mirrors the exact opposite of the approveTransaction hooks
   * in TransactionService.js.
   *
   * @param {import('mongoose').Document} transaction - Original POSTED transaction
   * @param {string} userId - Approver ID
   * @param {import('mongoose').ClientSession} session - DB Session
   * @param {string} reason - Reversal reason (for narration)
   */
  async _reverseModuleSubLedger(transaction, userId, session, reason) {
    const txnType = transaction.transactionType;
    const amount = transaction.amount;

    // ------------------------------------------------------------------
    // 1. SAVINGS DEPOSIT reversal → deduct from savings balance
    // ------------------------------------------------------------------
    if (txnType === 'SAVINGS_DEPOSIT' || txnType === 'INTEREST_CREDIT') {
      const SavingsAccount = mongoose.model('SavingsAccount');
      const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
      if (!account) throw AppError.notFound(`Savings account ${transaction.accountId} not found for reversal`);

      account.currentBalance = Math.max(0, Math.round((account.currentBalance - amount) * 100) / 100);
      account.availableBalance = Math.max(0, Math.round((account.availableBalance - amount) * 100) / 100);
      account.updatedBy = userId;
      await account.save({ session });

      await auditLogService.log({
        userId,
        action: 'REVERSAL_SAVINGS_DEPOSIT',
        module: 'SAVINGS',
        entityId: account._id.toString(),
        description: `Reversal: Deducted ₹${amount} from savings account ${account.accountNo}. Reason: ${reason}`,
      });
    }

    // ------------------------------------------------------------------
    // 2. SAVINGS WITHDRAWAL reversal → restore savings balance
    //    (available balance was already decremented on createTransaction;
    //     currentBalance was decremented on approveTransaction)
    // ------------------------------------------------------------------
    else if (txnType === 'SAVINGS_WITHDRAWAL') {
      const SavingsAccount = mongoose.model('SavingsAccount');
      const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
      if (!account) throw AppError.notFound(`Savings account ${transaction.accountId} not found for reversal`);

      account.currentBalance = Math.round((account.currentBalance + amount) * 100) / 100;
      account.availableBalance = Math.round((account.availableBalance + amount) * 100) / 100;
      account.updatedBy = userId;
      await account.save({ session });

      await auditLogService.log({
        userId,
        action: 'REVERSAL_SAVINGS_WITHDRAWAL',
        module: 'SAVINGS',
        entityId: account._id.toString(),
        description: `Reversal: Restored ₹${amount} to savings account ${account.accountNo}. Reason: ${reason}`,
      });
    }

    // ------------------------------------------------------------------
    // 3. LOAN EMI PAYMENT — find the payment record and reverse loan outstanding
    // ------------------------------------------------------------------
    else if (txnType === 'LOAN_INSTALLMENT') {
      // Find the loan payment record linked to this transaction via voucherId or find by narration reference
      const LoanPayment = mongoose.model('LoanPayment');
      const LoanAccount = mongoose.model('Loan');
      const LoanSchedule = mongoose.model('LoanSchedule');

      // The payment record that was created in LoanPaymentService stores the loan reference
      // We can locate it by matching the transaction's accountId (loanNo) and approvedAt proximity
      const payment = await LoanPayment.findOne({
        loanId: { $exists: true },
        isDeleted: false,
      })
        .sort('-createdAt')
        .session(session)
        .exec();

      // Prefer locating via sourceId on the transaction if set
      const loan = await LoanAccount.findOne({
        loanNo: transaction.accountId,
        isDeleted: false,
      }).session(session);

      if (loan) {
        // Restore outstanding values by reversing collected amounts
        // Read the last payment for this loan around the transaction's approvedAt time
        const loanPayment = await LoanPayment.findOne({
          loanId: loan._id,
          isDeleted: false,
          createdAt: { $gte: new Date(transaction.approvedAt.getTime() - 60000) },
        })
          .sort('-createdAt')
          .session(session)
          .exec();

        if (loanPayment) {
          loan.outstandingPrincipal = Math.round((loan.outstandingPrincipal + loanPayment.principalCollected) * 100) / 100;
          loan.outstandingInterest = Math.round((loan.outstandingInterest + loanPayment.interestCollected) * 100) / 100;
          loan.overdueAmount = Math.round((loan.overdueAmount + loanPayment.penaltyCollected) * 100) / 100;
          loan.penaltyAccrued = Math.round((loan.penaltyAccrued + loanPayment.penaltyCollected) * 100) / 100;

          // Reopen loan if it was closed by this payment
          if (loan.loanStatus === 'closed' && loanPayment.principalCollected > 0) {
            loan.loanStatus = 'active';
            loan.closedAt = null;
          }

          loan.updatedBy = userId;
          await loan.save({ session });

          // Reverse schedule installment payment status for the affected installments
          if (loanPayment.scheduleId) {
            const schedule = await LoanSchedule.findById(loanPayment.scheduleId).session(session);
            if (schedule && schedule.paymentStatus === 'paid') {
              schedule.principalPaid = Math.max(0, (schedule.principalPaid || 0) - loanPayment.principalCollected);
              schedule.interestPaid = Math.max(0, (schedule.interestPaid || 0) - loanPayment.interestCollected);
              schedule.penaltyPaid = Math.max(0, (schedule.penaltyPaid || 0) - loanPayment.penaltyCollected);
              schedule.paymentStatus = schedule.principalPaid >= schedule.principalDue ? 'paid' : 'pending';
              await schedule.save({ session });
            }
          }

          // Soft-delete the reversed payment record
          loanPayment.isDeleted = true;
          loanPayment.updatedBy = userId;
          await loanPayment.save({ session });

          await auditLogService.log({
            userId,
            action: 'REVERSAL_LOAN_PAYMENT',
            module: 'LOAN',
            entityId: loan._id.toString(),
            description: `Reversal: Restored loan ${loan.loanNo} outstanding. Principal +₹${loanPayment.principalCollected}, Interest +₹${loanPayment.interestCollected}, Penalty +₹${loanPayment.penaltyCollected}. Reason: ${reason}`,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // 4. FD DEPOSIT reversal — FD account principal stays (it was already set)
    //    but we restore funding savings balance if transfer-funded
    // ------------------------------------------------------------------
    else if (txnType === 'FD_DEPOSIT' || txnType === 'FD_DEPOSIT_TRANSFER') {
      if (txnType === 'FD_DEPOSIT_TRANSFER' && transaction.referenceNo) {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
        if (fundingAcc) {
          fundingAcc.currentBalance = Math.round((fundingAcc.currentBalance + amount) * 100) / 100;
          fundingAcc.availableBalance = Math.round((fundingAcc.availableBalance + amount) * 100) / 100;
          fundingAcc.updatedBy = userId;
          await fundingAcc.save({ session });
        }
      }
      // Mark the FD account back to pending_funding
      const FDAccount = mongoose.model('FDAccount');
      const fdAcc = await FDAccount.findOne({ fdAccountNo: transaction.accountId }).session(session);
      if (fdAcc) {
        fdAcc.status = 'pending_funding';
        fdAcc.updatedBy = userId;
        await fdAcc.save({ session });

        await auditLogService.log({
          userId,
          action: 'REVERSAL_FD_DEPOSIT',
          module: 'DEPOSITS',
          entityId: fdAcc._id.toString(),
          description: `Reversal: FD Account ${fdAcc.fdAccountNo} reverted to pending_funding. Reason: ${reason}`,
        });
      }
    }

    // ------------------------------------------------------------------
    // 5. RD DEPOSIT reversal — deduct from RD totalDepositAmount
    // ------------------------------------------------------------------
    else if (txnType === 'RD_DEPOSIT' || txnType === 'RD_DEPOSIT_TRANSFER') {
      const RDAccount = mongoose.model('RDAccount');
      const rdAcc = await RDAccount.findOne({ rdAccountNo: transaction.accountId }).session(session);
      if (rdAcc) {
        rdAcc.totalDepositAmount = Math.max(0, Math.round((rdAcc.totalDepositAmount - amount) * 100) / 100);
        rdAcc.updatedBy = userId;
        await rdAcc.save({ session });

        await auditLogService.log({
          userId,
          action: 'REVERSAL_RD_DEPOSIT',
          module: 'DEPOSITS',
          entityId: rdAcc._id.toString(),
          description: `Reversal: Deducted ₹${amount} from RD Account ${rdAcc.rdAccountNo} total deposit. Reason: ${reason}`,
        });
      }

      // Restore RD installment status
      const RDInstallment = mongoose.model('RDInstallment');
      const paidInstallment = await RDInstallment.findOne({
        rdAccountId: rdAcc?._id,
        paidDate: { $gte: new Date(transaction.approvedAt.getTime() - 60000) },
        status: 'paid',
      })
        .sort('-installmentNo')
        .session(session)
        .exec();

      if (paidInstallment) {
        paidInstallment.paidAmount = 0;
        paidInstallment.paidDate = null;
        paidInstallment.status = 'pending';
        await paidInstallment.save({ session });
      }

      if (txnType === 'RD_DEPOSIT_TRANSFER' && transaction.referenceNo) {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
        if (fundingAcc) {
          fundingAcc.currentBalance = Math.round((fundingAcc.currentBalance + amount) * 100) / 100;
          fundingAcc.availableBalance = Math.round((fundingAcc.availableBalance + amount) * 100) / 100;
          fundingAcc.updatedBy = userId;
          await fundingAcc.save({ session });
        }
      }
    }

    // ------------------------------------------------------------------
    // 6. DDS DEPOSIT reversal — deduct from DDS totalDeposit
    // ------------------------------------------------------------------
    else if (txnType === 'DDS_DEPOSIT' || txnType === 'DDS_DEPOSIT_TRANSFER') {
      const DDSAccount = mongoose.model('DDSAccount');
      const ddsAcc = await DDSAccount.findOne({ ddsAccountNo: transaction.accountId }).session(session);
      if (ddsAcc) {
        ddsAcc.totalDeposit = Math.max(0, Math.round((ddsAcc.totalDeposit - amount) * 100) / 100);
        ddsAcc.updatedBy = userId;
        await ddsAcc.save({ session });

        await auditLogService.log({
          userId,
          action: 'REVERSAL_DDS_DEPOSIT',
          module: 'DEPOSITS',
          entityId: ddsAcc._id.toString(),
          description: `Reversal: Deducted ₹${amount} from DDS Account ${ddsAcc.ddsAccountNo} total deposit. Reason: ${reason}`,
        });
      }

      if (txnType === 'DDS_DEPOSIT_TRANSFER' && transaction.referenceNo) {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
        if (fundingAcc) {
          fundingAcc.currentBalance = Math.round((fundingAcc.currentBalance + amount) * 100) / 100;
          fundingAcc.availableBalance = Math.round((fundingAcc.availableBalance + amount) * 100) / 100;
          fundingAcc.updatedBy = userId;
          await fundingAcc.save({ session });
        }
      }
    }

    // ------------------------------------------------------------------
    // 7. MIS DEPOSIT reversal — mark MIS back to pending_funding
    // ------------------------------------------------------------------
    else if (txnType === 'MIS_DEPOSIT' || txnType === 'MIS_DEPOSIT_TRANSFER') {
      const MISAccount = mongoose.model('MISAccount');
      const misAcc = await MISAccount.findOne({ misAccountNo: transaction.accountId }).session(session);
      if (misAcc) {
        misAcc.status = 'pending_funding';
        misAcc.updatedBy = userId;
        await misAcc.save({ session });

        await auditLogService.log({
          userId,
          action: 'REVERSAL_MIS_DEPOSIT',
          module: 'DEPOSITS',
          entityId: misAcc._id.toString(),
          description: `Reversal: MIS Account ${misAcc.misAccountNo} reverted to pending_funding. Reason: ${reason}`,
        });
      }

      if (txnType === 'MIS_DEPOSIT_TRANSFER' && transaction.referenceNo) {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
        if (fundingAcc) {
          fundingAcc.currentBalance = Math.round((fundingAcc.currentBalance + amount) * 100) / 100;
          fundingAcc.availableBalance = Math.round((fundingAcc.availableBalance + amount) * 100) / 100;
          fundingAcc.updatedBy = userId;
          await fundingAcc.save({ session });
        }
      }
    }
  }

  /**
   * Reject a reversal request.
   *
   * @param {string} reversalId - Reversal request ID
   * @param {string} userId - Approver ID
   * @param {string} remarks - Reject remarks
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Rejected reversal request
   */
  async rejectReversal(reversalId, userId, remarks, session) {
    try {
      const reversal = await this.repository.model.findById(reversalId).session(session);
      if (!reversal) {
        throw AppError.notFound('Reversal request not found');
      }
      if (reversal.status !== 'PENDING') {
        throw AppError.validation('Reversal request is already processed');
      }

      reversal.status = 'REJECTED';
      reversal.approvedBy = userId;
      reversal.approvedAt = new Date();
      reversal.remarks = remarks;
      await reversal.save({ session });

      return reversal;
    } catch (error) {
      this.handleError(error, 'Failed to reject transaction reversal');
    }
  }

  /**
   * Fetch reversal request details.
   *
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} docs and page count
   */
  async getReversals(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: [
          { path: 'transactionId', populate: { path: 'branchId' } },
          'requestedBy',
          'approvedBy',
        ],
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to query reversal list');
    }
  }
}

const reversalServiceInstance = new ReversalService();
export default reversalServiceInstance;
export { reversalServiceInstance as ReversalServiceInstance };
