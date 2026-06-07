import BaseService from './BaseService.js';
import transactionService from './TransactionService.js';
import savingsAccountRepository from '../repositories/SavingsAccountRepository.js';
import { savingsWithdrawalSchema } from '../schemas/savings.schema.js';
import { AppError } from '../utils/error-handler.js';

export class WithdrawalService extends BaseService {
  constructor() {
    super(savingsAccountRepository);
  }

  /**
   * Request a withdrawal from a savings account (Maker phase).
   *
   * @param {Object} data - Withdrawal details payload
   * @param {string} userId - Requesting operator user ID
   * @returns {Promise<import('mongoose').Document>} PENDING Transaction record
   */
  async withdrawFunds(data, userId) {
    // 1. Validate payload
    const validatedData = this.validate(savingsWithdrawalSchema, data);

    // 2. Retrieve savings account and check status
    const account = await this.repository.findById(validatedData.accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }

    if (account.status === 'closed') {
      throw AppError.validation('Cannot withdraw from a closed account.');
    }
    if (account.status === 'frozen') {
      throw AppError.validation(`Cannot withdraw from a frozen account. (Reason: ${account.freezeReason || 'Compliance Hold'})`);
    }
    if (account.status === 'dormant') {
      const remarks = validatedData.remarks || '';
      if (!remarks.toLowerCase().includes('reactivate')) {
        throw AppError.validation('Cannot withdraw from a dormant account. Please reactivate the account first, or write "Reactivate and withdraw" in the remarks to automatically lift dormancy.');
      }
      // Lift dormancy and save
      account.status = 'active';
      account.updatedBy = userId;
      await account.save();
    }

    // 3. Minimum balance guard
    if (account.availableBalance - validatedData.amount < account.minimumBalance) {
      throw AppError.validation(`Insufficient available balance. Required minimum balance: ₹${account.minimumBalance}. Current Available: ₹${account.availableBalance}. Requested: ₹${validatedData.amount}`);
    }

    // 4. Create transaction request (availableBalance hold is placed in TransactionService hook)
    const transaction = await transactionService.createTransaction({
      branchId: account.branchId,
      memberId: account.memberId,
      accountType: 'savings',
      accountId: account.accountNo,
      transactionType: 'SAVINGS_WITHDRAWAL',
      paymentMode: validatedData.paymentMode,
      amount: validatedData.amount,
      referenceNo: null,
      narration: validatedData.remarks || `Savings withdrawal via ${validatedData.paymentMode}`,
    }, userId);

    return transaction;
  }
}

const withdrawalServiceInstance = new WithdrawalService();
export default withdrawalServiceInstance;
export { withdrawalServiceInstance as WithdrawalServiceInstance };
