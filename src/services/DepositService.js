import BaseService from './BaseService.js';
import transactionService from './TransactionService.js';
import savingsAccountRepository from '../repositories/SavingsAccountRepository.js';
import { savingsDepositSchema } from '../schemas/savings.schema.js';
import { AppError } from '../utils/error-handler.js';

export class DepositService extends BaseService {
  constructor() {
    super(savingsAccountRepository);
  }

  /**
   * Request a deposit into a savings account (Maker phase).
   *
   * @param {Object} data - Deposit details payload
   * @param {string} userId - Requesting operator user ID
   * @returns {Promise<import('mongoose').Document>} PENDING Transaction record
   */
  async depositFunds(data, userId) {
    // 1. Validate payload
    const validatedData = this.validate(savingsDepositSchema, data);

    // 2. Retrieve savings account and check status
    const account = await this.repository.findById(validatedData.accountId);
    if (!account) {
      throw AppError.notFound('Savings account not found');
    }
    if (account.status !== 'active') {
      throw AppError.validation(`Account is not active (current status: ${account.status}). Deposits are only allowed on active accounts.`);
    }

    // 3. Create the transaction via TransactionService
    const transaction = await transactionService.createTransaction({
      branchId: account.branchId,
      memberId: account.memberId,
      accountType: 'savings',
      accountId: account.accountNo,
      transactionType: 'SAVINGS_DEPOSIT',
      paymentMode: validatedData.paymentMode,
      amount: validatedData.amount,
      referenceNo: validatedData.referenceNo || null,
      narration: validatedData.remarks || `Savings deposit via ${validatedData.paymentMode}`,
    }, userId);

    return transaction;
  }
}

const depositServiceInstance = new DepositService();
export default depositServiceInstance;
export { depositServiceInstance as DepositServiceInstance };
