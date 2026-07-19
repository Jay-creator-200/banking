import BaseService from './BaseService.js';
import transactionRepository from '../repositories/TransactionRepository.js';
import sequenceService from './SequenceService.js';
import approvalService from './ApprovalService.js';
import ledgerService from './LedgerService.js';
import approvalRequestRepository from '../repositories/ApprovalRequestRepository.js';
import { createTransactionSchema } from '../schemas/transaction.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';
import cashSessionService from './CashSessionService.js';

const TRANSFER_DEPOSIT_TYPES = [
  'RD_DEPOSIT_TRANSFER',
  'FD_DEPOSIT_TRANSFER',
  'DDS_DEPOSIT_TRANSFER',
  'MIS_DEPOSIT_TRANSFER',
];

const isSavingsTransferDeposit = (transaction) => (
  TRANSFER_DEPOSIT_TYPES.includes(transaction.transactionType)
  && transaction.paymentMode === 'TRANSFER'
  && transaction.referenceNo
  && transaction.referenceNo !== 'Initial Funding'
);

export class TransactionService extends BaseService {
  constructor() {
    super(transactionRepository);
  }

  /**
   * Create a transaction in PENDING state and queue for approval.
   *
   * @param {Object} data - Transaction details payload
   * @param {string} userId - Requesting operator user ID
   * @param {import('mongoose').ClientSession} [externalSession=null] - External DB session
   * @returns {Promise<import('mongoose').Document>} PENDING Transaction record
   */
  async createTransaction(data, userId, externalSession = null) {
    const session = externalSession || (await mongoose.startSession());
    const isLocalSession = !externalSession;
    if (isLocalSession) {
      session.startTransaction();
    }
    try {
      // Validate schema
      const validatedData = this.validate(createTransactionSchema, data);

      // Generate sequence number atomically
      const transactionNo = await sequenceService.generateTransactionNo(validatedData.branchId, session);

      // Check for savings withdrawal hold
      const isSavingsWithdrawal = validatedData.transactionType === 'SAVINGS_WITHDRAWAL';
      const isSavingsFundedDeposit = isSavingsTransferDeposit(validatedData);

      if (isSavingsWithdrawal || isSavingsFundedDeposit) {
        const savingsAccountNo = isSavingsWithdrawal ? validatedData.accountId : validatedData.referenceNo;
        if (!savingsAccountNo) {
          throw AppError.validation('Source savings account number is required for transfer.');
        }
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: savingsAccountNo }).session(session);
        if (!account) {
          throw AppError.notFound(`Source savings account ${savingsAccountNo} not found`);
        }
        if (account.status.toUpperCase() !== 'ACTIVE') {
          throw AppError.validation(`Savings account is not active (current status: ${account.status})`);
        }
        if (account.availableBalance - validatedData.amount < account.minimumBalance) {
          throw AppError.validation(`Insufficient available balance. Required minimum balance: ₹${account.minimumBalance}`);
        }
        account.availableBalance -= validatedData.amount;
        account.updatedBy = userId;
        await account.save({ session });
      }

      // Create PENDING transaction
      const transaction = await this.repository.create(
        {
          ...validatedData,
          transactionNo,
          status: 'PENDING',
          createdBy: userId,
          updatedBy: userId,
        },
        { session }
      );

      const User = mongoose.model('User');
      const creator = await User.findById(userId).populate('roleId').session(session);
      const isSuperAdmin = creator?.roleId?.code === 'SUPER_ADMIN';

      if (isSuperAdmin) {
        // Direct auto-posting bypass for Super Admin
        await this.approveTransaction(transaction._id, userId, session);
      } else {
        // Queue an approval request
        await approvalService.createApproval(
          {
            moduleName: 'TRANSACTION',
            referenceCollection: 'Transaction',
            referenceId: transaction._id,
            requestType: 'CREATE',
          },
          userId,
          session
        );
      }

      // Return the updated document from the database (refetched after posting changes)
      const finalTransaction = await this.repository.model.findById(transaction._id).session(session);

      if (isLocalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return finalTransaction || transaction;
    } catch (error) {
      console.error("RAW TRANSACTION SERVICE ERROR:", error);
      if (isLocalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      this.handleError(error, 'Failed to create transaction request');
    }
  }

  /**
   * Approve transaction (called via approval queue callback).
   *
   * @param {string} txnId - Transaction ID
   * @param {string} userId - Approving User ID
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Posted Transaction record
   */
  async approveTransaction(txnId, userId, session) {
    try {
      const transaction = await this.repository.model.findById(txnId).session(session);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'PENDING') {
        throw AppError.validation(`Transaction must be PENDING to approve. Current status: ${transaction.status}`);
      }

      // Update transaction status
      transaction.status = 'POSTED';
      transaction.approvedBy = userId;
      transaction.approvedAt = new Date();
      transaction.updatedBy = userId;
      await transaction.save({ session });

      // Post entries to Double-Entry Ledger
      await ledgerService.postTransaction(transaction, userId, session);

      // If this was a CASH transaction linked to a teller session, register it
      if (transaction.paymentMode === 'CASH' && transaction.sessionId) {
        try {
          const txnType = [
            'SAVINGS_DEPOSIT', 'MEMBERSHIP_FEE', 'SHARE_PURCHASE', 'LOAN_INSTALLMENT'
          ].includes(transaction.transactionType) ? 'deposit' : 'withdrawal';
          await cashSessionService.linkTransactionToSession(
            transaction.sessionId, transaction, txnType, session
          );
        } catch (sessionLinkErr) {
          // Non-fatal: log but don't block the approval
          console.error('[CashSession] Failed to link transaction to session:', sessionLinkErr.message);
        }
      }

      // Execute post-approval hooks for savings account
      if (transaction.transactionType === 'SAVINGS_DEPOSIT' || transaction.transactionType === 'INTEREST_CREDIT') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (!account) {
          throw AppError.notFound('Savings account not found');
        }
        account.currentBalance += transaction.amount;
        account.availableBalance += transaction.amount;
        account.updatedBy = userId;
        await account.save({ session });
        
        transaction.balanceAfter = account.currentBalance;
        await transaction.save({ session });
      } else if (transaction.transactionType === 'SAVINGS_WITHDRAWAL') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (!account) {
          throw AppError.notFound('Savings account not found');
        }
        account.currentBalance -= transaction.amount;
        account.updatedBy = userId;
        await account.save({ session });

        transaction.balanceAfter = account.currentBalance;
        await transaction.save({ session });
      }
      // --- DEPOSITS MODULE POST-APPROVAL HOOKS ---
      // 1. RD Deposits
      else if (transaction.transactionType === 'RD_DEPOSIT' || transaction.transactionType === 'RD_DEPOSIT_TRANSFER') {
        const rdService = (await import('./RDService.js')).default;
        await rdService.handlePostApprovalDeposit(transaction, userId, session);

        if (transaction.transactionType === 'RD_DEPOSIT_TRANSFER' && transaction.referenceNo) {
          const SavingsAccount = mongoose.model('SavingsAccount');
          const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
          if (fundingAcc) {
            fundingAcc.currentBalance -= transaction.amount;
            await fundingAcc.save({ session });
          }
        }
      }

      // 2. FD Deposits
      else if (transaction.transactionType === 'FD_DEPOSIT' || transaction.transactionType === 'FD_DEPOSIT_TRANSFER') {
        const fdService = (await import('./FDService.js')).default;
        await fdService.handlePostApprovalDeposit(transaction, userId, session);

        if (transaction.transactionType === 'FD_DEPOSIT_TRANSFER' && transaction.referenceNo) {
          const SavingsAccount = mongoose.model('SavingsAccount');
          const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
          if (fundingAcc) {
            fundingAcc.currentBalance -= transaction.amount;
            await fundingAcc.save({ session });
          }
        }
      }

      // 3. DDS Deposits
      else if (transaction.transactionType === 'DDS_DEPOSIT' || transaction.transactionType === 'DDS_DEPOSIT_TRANSFER') {
        const ddsService = (await import('./DDSService.js')).default;
        await ddsService.handlePostApprovalDeposit(transaction, userId, session);

        if (transaction.transactionType === 'DDS_DEPOSIT_TRANSFER' && transaction.referenceNo) {
          const SavingsAccount = mongoose.model('SavingsAccount');
          const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
          if (fundingAcc) {
            fundingAcc.currentBalance -= transaction.amount;
            await fundingAcc.save({ session });
          }
        }
      }

      // 4. MIS Deposits
      else if (transaction.transactionType === 'MIS_DEPOSIT' || transaction.transactionType === 'MIS_DEPOSIT_TRANSFER') {
        const misService = (await import('./MISService.js')).default;
        await misService.handlePostApprovalDeposit(transaction, userId, session);

        if (transaction.transactionType === 'MIS_DEPOSIT_TRANSFER' && transaction.referenceNo) {
          const SavingsAccount = mongoose.model('SavingsAccount');
          const fundingAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
          if (fundingAcc) {
            fundingAcc.currentBalance -= transaction.amount;
            await fundingAcc.save({ session });
          }
        }
      }

      // 5. MIS Monthly Payouts
      else if (transaction.transactionType === 'MIS_PAYOUT_TRANSFER') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const destAcc = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (destAcc) {
          destAcc.currentBalance += transaction.amount;
          destAcc.availableBalance += transaction.amount;
          await destAcc.save({ session });
        }
        const misService = (await import('./MISService.js')).default;
        await misService.handlePostApprovalPayout(transaction, userId, session);
      }
      else if (transaction.transactionType === 'MIS_PAYOUT') {
        const misService = (await import('./MISService.js')).default;
        await misService.handlePostApprovalPayout(transaction, userId, session);
      }

      // 6. Closures and Maturity liquidations (Withdrawals)
      else if ([
        'RD_WITHDRAWAL', 'FD_WITHDRAWAL', 'DDS_WITHDRAWAL', 'MIS_WITHDRAWAL',
        'RD_WITHDRAWAL_TRANSFER', 'FD_WITHDRAWAL_TRANSFER', 'DDS_WITHDRAWAL_TRANSFER', 'MIS_WITHDRAWAL_TRANSFER'
      ].includes(transaction.transactionType)) {
        const depositMaturityService = (await import('./DepositMaturityService.js')).default;
        await depositMaturityService.handlePostApprovalWithdrawal(transaction, userId, session);

        if (transaction.transactionType.endsWith('_TRANSFER') && transaction.referenceNo) {
          const SavingsAccount = mongoose.model('SavingsAccount');
          const destAcc = await SavingsAccount.findOne({ accountNo: transaction.referenceNo }).session(session);
          if (destAcc) {
            destAcc.currentBalance += transaction.amount;
            destAcc.availableBalance += transaction.amount;
            await destAcc.save({ session });
          }
        }
      }

      // Execute post-approval hook for share capital purchase
      if (transaction.transactionType === 'SHARE_PURCHASE' && transaction.sourceCollection === 'ShareCertificate') {
        const ShareCertificate = mongoose.model('ShareCertificate');
        const ShareLedger = mongoose.model('ShareLedger');
        await ShareCertificate.findByIdAndUpdate(transaction.sourceId, { status: 'active' }).session(session);
        await ShareLedger.findOneAndUpdate({ transactionId: transaction._id }, { status: 'active' }).session(session);
      }

      // Trigger transaction notifications in the background (post-commit)
      setTimeout(async () => {
        try {
          const { default: notificationService } = await import('./NotificationService.js');
          await notificationService.triggerTransactionAlert(transaction._id.toString());
        } catch (err) {
          console.error('[Notification Trigger] Failed to dispatch alert:', err.message);
        }
      }, 100);

      return transaction;
    } catch (error) {
      this.handleError(error, 'Failed to approve and post transaction');
    }
  }

  /**
   * Reject transaction (called via approval queue callback).
   *
   * @param {string} txnId - Transaction ID
   * @param {string} userId - Approver ID
   * @param {string} remarks - Reject remarks
   * @param {import('mongoose').ClientSession} session - DB Session
   * @returns {Promise<import('mongoose').Document>} Cancelled Transaction record
   */
  async rejectTransaction(txnId, userId, remarks, session) {
    try {
      const transaction = await this.repository.model.findById(txnId).session(session);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'PENDING') {
        throw AppError.validation('Transaction is not in PENDING state');
      }

      transaction.status = 'CANCELLED';
      transaction.approvedBy = userId;
      transaction.approvedAt = new Date();
      transaction.updatedBy = userId;
      if (remarks) {
        transaction.narration = `${transaction.narration || ''} (Rejected: ${remarks})`.trim();
      }
      await transaction.save({ session });

      // Release hold on available balance if it was a savings withdrawal
      if (transaction.transactionType === 'SAVINGS_WITHDRAWAL') {
        const SavingsAccount = mongoose.model('SavingsAccount');
        const account = await SavingsAccount.findOne({ accountNo: transaction.accountId }).session(session);
        if (account) {
          account.availableBalance += transaction.amount;
          account.updatedBy = userId;
          await account.save({ session });
        }
      }

      return transaction;
    } catch (error) {
      this.handleError(error, 'Failed to reject transaction');
    }
  }

  /**
   * Cancel transaction request (initiated by maker before approval action).
   *
   * @param {string} txnId - Transaction ID
   * @param {string} userId - Maker User ID
   * @param {string} [reason] - Reason for cancellation
   * @returns {Promise<import('mongoose').Document>} Cancelled Transaction record
   */
  async cancelTransaction(txnId, userId, reason = '') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const transaction = await this.repository.findById(txnId);
      if (!transaction) {
        throw AppError.notFound('Transaction not found');
      }
      if (transaction.status !== 'PENDING') {
        throw AppError.validation('Only pending transactions can be cancelled');
      }
      if (transaction.createdBy.toString() !== userId.toString()) {
        throw AppError.forbidden('Only the creator of the transaction request can cancel it');
      }

      // Update transaction status
      transaction.status = 'CANCELLED';
      transaction.updatedBy = userId;
      if (reason) {
        transaction.narration = `${transaction.narration || ''} (Cancelled: ${reason})`.trim();
      }
      await transaction.save({ session });

      // Release hold on available balance if it was a savings withdrawal or transfer-based deposit funding
      const isSavingsWithdrawal = transaction.transactionType === 'SAVINGS_WITHDRAWAL';
      const isSavingsFundedDeposit = isSavingsTransferDeposit(transaction);

      if (isSavingsWithdrawal || isSavingsFundedDeposit) {
        const savingsAccountNo = isSavingsWithdrawal ? transaction.accountId : transaction.referenceNo;
        if (savingsAccountNo) {
          const SavingsAccount = mongoose.model('SavingsAccount');
          const account = await SavingsAccount.findOne({ accountNo: savingsAccountNo }).session(session);
          if (account) {
            account.availableBalance += transaction.amount;
            account.updatedBy = userId;
            await account.save({ session });
          }
        }
      }

      // Cancel associated approval request in queue
      const approval = await approvalRequestRepository.findOne({
        moduleName: 'TRANSACTION',
        referenceId: transaction._id,
        status: 'PENDING',
      });
      if (approval) {
        approval.status = 'REJECTED';
        approval.remarks = reason || 'Cancelled by maker';
        approval.approvedBy = userId;
        approval.approvedAt = new Date();
        await approval.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to cancel transaction request');
    }
  }

  /**
   * Search transactions with query filters.
   *
   * @param {Object} filters - Search filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} docs and page summary
   */
  async getTransactions(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: ['branchId', 'approvedBy', 'createdBy'],
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to retrieve transactions');
    }
  }
}

const transactionServiceInstance = new TransactionService();
export default transactionServiceInstance;
export { transactionServiceInstance as TransactionServiceInstance };
