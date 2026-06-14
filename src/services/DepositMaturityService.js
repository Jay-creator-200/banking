import BaseService from './BaseService.js';
import rdAccountRepository from '../repositories/RDAccountRepository.js';
import fdAccountRepository from '../repositories/FDAccountRepository.js';
import ddsAccountRepository from '../repositories/DDSAccountRepository.js';
import misAccountRepository from '../repositories/MISAccountRepository.js';
import transactionService from './TransactionService.js';
import auditLogService from './AuditLogService.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class DepositMaturityService extends BaseService {
  constructor() {
    super(rdAccountRepository); // primary repo; other repos accessed directly
  }
  /**
   * Helper to retrieve repository based on account type
   */
  getRepository(accountType) {
    switch (accountType.toUpperCase()) {
      case 'RD': return rdAccountRepository;
      case 'FD': return fdAccountRepository;
      case 'DDS': return ddsAccountRepository;
      case 'MIS': return misAccountRepository;
      default: throw AppError.validation(`Invalid deposit account type: ${accountType}`);
    }
  }

  /**
   * Liquidate a matured deposit account (creates a Transaction Request in PENDING state)
   */
  async liquidateMaturedAccount(accountId, accountType, paymentMode, destSavingsAccountNo, userId) {
    const repo = this.getRepository(accountType);
    const account = await repo.findById(accountId);
    if (!account) throw AppError.notFound(`${accountType} account not found`);

    if (account.status.toUpperCase() !== 'MATURED') {
      throw AppError.validation(`Account is not matured (current status: ${account.status}). Only matured accounts can be liquidated here.`);
    }

    // Determine payout amount and account number field
    let amount = 0;
    let accountNo = '';
    let sourceCol = '';

    if (accountType.toUpperCase() === 'RD') {
      amount = account.totalDepositAmount + (account.totalInterest || 0); // fallback if maturity calculations differ
      amount = account.maturityAmount || amount;
      accountNo = account.rdAccountNo;
      sourceCol = 'RDAccount';
    } else if (accountType.toUpperCase() === 'FD') {
      amount = account.maturityAmount;
      accountNo = account.fdAccountNo;
      sourceCol = 'FDAccount';
    } else if (accountType.toUpperCase() === 'DDS') {
      amount = account.maturityAmount;
      accountNo = account.ddsAccountNo;
      sourceCol = 'DDSAccount';
    } else if (accountType.toUpperCase() === 'MIS') {
      amount = account.principalAmount; // Interest was paid monthly
      accountNo = account.misAccountNo;
      sourceCol = 'MISAccount';
    }

    const txnType = `${accountType.toUpperCase()}_WITHDRAWAL${paymentMode === 'TRANSFER' ? '_TRANSFER' : ''}`;

    // Create pending transaction request
    const transaction = await transactionService.createTransaction({
      branchId: account.branchId,
      memberId: account.memberId,
      accountType: 'scheme',
      accountId: accountNo,
      transactionType: txnType,
      paymentMode,
      amount,
      referenceNo: destSavingsAccountNo || 'Maturity Payout',
      narration: `Maturity liquidation payout for ${accountNo}`,
      sourceCollection: sourceCol,
      sourceId: account._id.toString(),
    }, userId);

    return transaction;
  }

  /**
   * Handle post-approval closure of matured account.
   * Called by TransactionService hooks when a withdrawal transaction is approved.
   */
  async handlePostApprovalWithdrawal(transaction, userId, session) {
    const accountType = transaction.transactionType.split('_')[0]; // 'RD', 'FD', 'DDS', 'MIS'
    const repo = this.getRepository(accountType);

    // Look up by account number field
    let account;
    if (accountType === 'RD') {
      account = await repo.model.findOne({ rdAccountNo: transaction.accountId }).session(session);
    } else if (accountType === 'FD') {
      account = await repo.model.findOne({ fdAccountNo: transaction.accountId }).session(session);
    } else if (accountType === 'DDS') {
      account = await repo.model.findOne({ ddsAccountNo: transaction.accountId }).session(session);
    } else if (accountType === 'MIS') {
      account = await repo.model.findOne({ misAccountNo: transaction.accountId }).session(session);
    }

    if (!account) throw AppError.notFound(`${accountType} account not found for liquidation.`);

    account.status = 'closed';
    account.updatedBy = userId;
    await account.save({ session });

    await auditLogService.log({
      userId,
      action: 'DEPOSIT_CLOSED',
      module: 'DEPOSITS',
      entityId: account._id.toString(),
      description: `Maturity liquidation completed. Closed ${accountType} account ${transaction.accountId}`,
    });

    transaction.balanceAfter = 0;
    await transaction.save({ session });
  }

  /**
   * Renew a matured FD Account
   */
  async renewFDAccount(fdAccountId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const fdAccount = await fdAccountRepository.findById(fdAccountId);
      if (!fdAccount) throw AppError.notFound('FD Account not found');
      if (fdAccount.status.toUpperCase() !== 'MATURED') {
        throw AppError.validation('Only matured FD accounts can be renewed.');
      }

      // Close old FD account
      fdAccount.status = 'closed';
      fdAccount.updatedBy = userId;
      await fdAccount.save({ session });

      await auditLogService.log({
        userId,
        action: 'FD_ACCOUNT_CLOSED_RENEW',
        module: 'DEPOSITS',
        entityId: fdAccount._id.toString(),
        description: `Closed FD ${fdAccount.fdAccountNo} for renewal`,
      });

      // Book a new FD account under the same scheme with the maturity amount rolled over
      const FDService = (await import('./FDService.js')).default;
      const newFD = await FDService.openAccount({
        memberId: fdAccount.memberId.toString(),
        schemeId: fdAccount.schemeId.toString(),
        branchId: fdAccount.branchId.toString(),
        principalAmount: fdAccount.maturityAmount,
        tenureMonths: fdAccount.tenureMonths,
        paymentMode: fdAccount.paymentMode,
        fundingSource: 'TRANSFER', // fund via transfer from old FD
        fundingSavingsAccountNo: fdAccount.fdAccountNo, // reference old FD
      }, userId);

      await session.commitTransaction();
      session.endSession();
      return newFD;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

const depositMaturityService = new DepositMaturityService();
export default depositMaturityService;
export { depositMaturityService as DepositMaturityServiceInstance };
