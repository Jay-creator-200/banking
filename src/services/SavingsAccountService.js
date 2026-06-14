import BaseService from './BaseService.js';
import savingsAccountRepository from '../repositories/SavingsAccountRepository.js';
import sequenceService from './SequenceService.js';
import transactionService from './TransactionService.js';
import auditLogService from './AuditLogService.js';
import { openSavingsAccountSchema, savingsFreezeSchema, savingsUnfreezeSchema, savingsCloseSchema } from '../schemas/savings.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class SavingsAccountService extends BaseService {
  constructor() {
    super(savingsAccountRepository);
  }

  /**
   * Open a new savings account.
   *
   * @param {Object} data - Input payload
   * @param {string} userId - Operator User ID
   * @returns {Promise<import('mongoose').Document>} SavingsAccount record
   */
  async openAccount(data, userId, isAutoCreate = false, externalSession = null) {
    const validatedData = this.validate(openSavingsAccountSchema, data);

    const session = externalSession || (await mongoose.startSession());
    if (!externalSession) {
      session.startTransaction();
    }
    let account;

    try {
      // 1. Fetch Member & Validate Status
      const Member = mongoose.model('Member');
      const member = await Member.findById(validatedData.memberId).session(session);
      if (!member) {
        throw AppError.notFound('Member not found');
      }
      if (member.memberStatus !== 'active') {
        throw AppError.validation(`Member status is not active (current status: ${member.memberStatus})`);
      }
      if (!isAutoCreate && member.kycStatus !== 'verified') {
        throw AppError.validation(`Member KYC must be verified. Current status: ${member.kycStatus}`);
      }

      // 2. Determine default minimum balance and interest rates if not supplied
      let minBalance = validatedData.minimumBalance;
      let intRate = validatedData.interestRate;

      if (minBalance === undefined || minBalance === null) {
        if (validatedData.accountType === 'staff') {
          minBalance = 0;
        } else if (validatedData.accountType === 'senior_citizen') {
          minBalance = 500;
        } else {
          minBalance = 1000;
        }
      }

      if (intRate === undefined || intRate === null) {
        if (validatedData.accountType === 'staff') {
          intRate = 5.5;
        } else if (validatedData.accountType === 'senior_citizen') {
          intRate = 4.5;
        } else {
          intRate = 4.0;
        }
      }

      // 3. Generate account number SAV-YYYY-XXXXXX atomically
      const accountNo = await sequenceService.generateSequence('SAV', validatedData.branchId, session);

      // 4. Create the savings account
      const accountPayload = {
        accountNo,
        memberId: validatedData.memberId,
        branchId: validatedData.branchId,
        openingDate: new Date(),
        accountType: validatedData.accountType,
        minimumBalance: minBalance,
        interestRate: intRate,
        currentBalance: 0,
        availableBalance: 0,
        status: 'active',
        createdBy: userId,
        updatedBy: userId,
      };

      const [newAccount] = await mongoose.model('SavingsAccount').create([accountPayload], { session });
      account = newAccount;

      await auditLogService.logAction(
        userId,
        'SAVINGS',
        'OPEN_ACCOUNT',
        'SavingsAccount',
        account._id,
        null,
        accountPayload
      );

      if (!externalSession) {
        await session.commitTransaction();
        session.endSession();
      }
    } catch (error) {
      if (!externalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      this.handleError(error, 'Failed to open savings account');
    }

    // 5. Create optional opening deposit transaction request (runs in its own transactional context)
    if (validatedData.openingDeposit > 0) {
      try {
        await transactionService.createTransaction({
          branchId: validatedData.branchId,
          memberId: validatedData.memberId,
          accountType: 'savings',
          accountId: account.accountNo,
          transactionType: 'SAVINGS_DEPOSIT',
          paymentMode: validatedData.paymentMode || 'CASH',
          amount: validatedData.openingDeposit,
          referenceNo: 'Opening Deposit',
          narration: 'Account opening deposit',
        }, userId);
      } catch (depositError) {
        console.error('Failed to post opening deposit transaction for savings account:', depositError);
        // We do not fail the account creation if the deposit request fails to queue, but we log the issue.
      }
    }

    return account;
  }

  /**
   * Freeze a savings account.
   */
  async freezeAccount(data, userId) {
    const validated = this.validate(savingsFreezeSchema, data);
    const account = await this.repository.findById(validated.accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }
    if (account.status === 'closed') {
      throw AppError.validation('Cannot freeze a closed account');
    }

    const oldValues = { status: account.status, freezeReason: account.freezeReason };
    account.status = 'frozen';
    account.freezeReason = validated.reason;
    account.updatedBy = userId;
    await account.save();

    await auditLogService.logAction(
      userId,
      'SAVINGS',
      'FREEZE_ACCOUNT',
      'SavingsAccount',
      account._id,
      oldValues,
      { status: 'frozen', freezeReason: validated.reason }
    );

    return account;
  }

  /**
   * Unfreeze a savings account.
   */
  async unfreezeAccount(data, userId) {
    const validated = this.validate(savingsUnfreezeSchema, data);
    const account = await this.repository.findById(validated.accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }
    if (account.status !== 'frozen') {
      throw AppError.validation(`Account is not frozen. Current status: ${account.status}`);
    }

    const oldValues = { status: account.status, freezeReason: account.freezeReason };
    account.status = 'active';
    account.freezeReason = null;
    account.updatedBy = userId;
    await account.save();

    await auditLogService.logAction(
      userId,
      'SAVINGS',
      'UNFREEZE_ACCOUNT',
      'SavingsAccount',
      account._id,
      oldValues,
      { status: 'active', freezeReason: null }
    );

    return account;
  }

  /**
   * Close a savings account.
   */
  async closeAccount(data, userId) {
    const validated = this.validate(savingsCloseSchema, data);
    const account = await this.repository.findById(validated.accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }
    if (account.status === 'closed') {
      throw AppError.validation('Account is already closed');
    }
    if (account.currentBalance !== 0 || account.availableBalance !== 0) {
      throw AppError.validation(`Account balance must be zero to close. Current: ₹${account.currentBalance}, Available: ₹${account.availableBalance}`);
    }

    const oldValues = { status: account.status, closedAt: account.closedAt, closedBy: account.closedBy };
    account.status = 'closed';
    account.closedAt = new Date();
    account.closedBy = userId;
    account.updatedBy = userId;
    await account.save();

    await auditLogService.logAction(
      userId,
      'SAVINGS',
      'CLOSE_ACCOUNT',
      'SavingsAccount',
      account._id,
      oldValues,
      { status: 'closed', closedAt: account.closedAt, closedBy: userId }
    );

    return account;
  }

  /**
   * Automatically marks account as dormant if no transactions occurred for 12 months.
   */
  async markDormant(accountId, userId) {
    const account = await this.repository.findById(accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }
    if (account.status !== 'active') {
      throw AppError.validation(`Only active accounts can be marked dormant. Current status: ${account.status}`);
    }

    const oldValues = { status: account.status };
    account.status = 'dormant';
    account.updatedBy = userId;
    await account.save();

    await auditLogService.logAction(
      userId,
      'SAVINGS',
      'MARK_DORMANT',
      'SavingsAccount',
      account._id,
      oldValues,
      { status: 'dormant' }
    );

    return account;
  }

  /**
   * Find details by Account Number.
   */
  async findDetailByAccountNo(accountNo) {
    try {
      const account = await this.repository.findDetailByAccountNo(accountNo);
      if (!account) {
        throw AppError.notFound('Savings account not found');
      }
      return account;
    } catch (error) {
      this.handleError(error, 'Failed to fetch savings account details');
    }
  }
}

const savingsAccountServiceInstance = new SavingsAccountService();
export default savingsAccountServiceInstance;
export { savingsAccountServiceInstance as SavingsAccountServiceInstance };
