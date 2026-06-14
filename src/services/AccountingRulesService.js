export class AccountingRulesService {
  /**
   * Get debit/credit account head codes mapping for a transaction type.
   *
   * @param {string} transactionType - Transaction type enum.
   * @returns {Object|null} Mappings of codes.
   */
  getRule(transactionType) {
    const rules = {
      SAVINGS_DEPOSIT: {
        debitCode: '11001', // Cash In Hand
        creditCode: '21001', // Savings Deposit Liability
      },
      SAVINGS_WITHDRAWAL: {
        debitCode: '21001', // Savings Deposit Liability
        creditCode: '11001', // Cash In Hand
      },
      LOAN_DISBURSEMENT: {
        debitCode: '12001', // Loan Receivable
        creditCode: '11001', // Cash In Hand
      },
      LOAN_INSTALLMENT: {
        debitCode: '11001', // Cash In Hand
        creditCodes: {
          principal: '12001', // Loan Receivable
          interest: '41001', // Interest Income
        },
      },
      MEMBERSHIP_FEE: {
        debitCode: '11001', // Cash In Hand
        creditCode: '41003', // Membership Fee Income
      },
      SHARE_PURCHASE: {
        debitCode: '11001', // Cash In Hand
        creditCode: '31001', // Share Capital
      },
      INTEREST_CREDIT: {
        debitCode: '51001', // Interest Expenses
        creditCode: '21001', // Savings Deposit Liability
      },
      RD_DEPOSIT: {
        debitCode: '11001', // Cash In Hand
        creditCode: '21002', // Recurring Deposit Liability
      },
      RD_DEPOSIT_TRANSFER: {
        debitCode: '21001', // Savings Deposit Liability
        creditCode: '21002', // Recurring Deposit Liability
      },
      RD_WITHDRAWAL: {
        debitCode: '21002', // Recurring Deposit Liability
        creditCode: '11001', // Cash In Hand
      },
      RD_WITHDRAWAL_TRANSFER: {
        debitCode: '21002', // Recurring Deposit Liability
        creditCode: '21001', // Savings Deposit Liability
      },
      RD_INTEREST: {
        debitCode: '51001', // Interest Expenses
        creditCode: '21002', // Recurring Deposit Liability
      },
      FD_DEPOSIT: {
        debitCode: '11001', // Cash In Hand
        creditCode: '21003', // Fixed Deposit Liability
      },
      FD_DEPOSIT_TRANSFER: {
        debitCode: '21001', // Savings Deposit Liability
        creditCode: '21003', // Fixed Deposit Liability
      },
      FD_WITHDRAWAL: {
        debitCode: '21003', // Fixed Deposit Liability
        creditCode: '11001', // Cash In Hand
      },
      FD_WITHDRAWAL_TRANSFER: {
        debitCode: '21003', // Fixed Deposit Liability
        creditCode: '21001', // Savings Deposit Liability
      },
      FD_INTEREST: {
        debitCode: '51001', // Interest Expenses
        creditCode: '21003', // Fixed Deposit Liability
      },
      DDS_DEPOSIT: {
        debitCode: '11001', // Cash In Hand
        creditCode: '21004', // Daily Deposit Scheme Liability
      },
      DDS_DEPOSIT_TRANSFER: {
        debitCode: '21001', // Savings Deposit Liability
        creditCode: '21004', // Daily Deposit Scheme Liability
      },
      DDS_WITHDRAWAL: {
        debitCode: '21004', // Daily Deposit Scheme Liability
        creditCode: '11001', // Cash In Hand
      },
      DDS_WITHDRAWAL_TRANSFER: {
        debitCode: '21004', // Daily Deposit Scheme Liability
        creditCode: '21001', // Savings Deposit Liability
      },
      DDS_INTEREST: {
        debitCode: '51001', // Interest Expenses
        creditCode: '21004', // Daily Deposit Scheme Liability
      },
      MIS_DEPOSIT: {
        debitCode: '11001', // Cash In Hand
        creditCode: '21005', // Monthly Income Scheme Liability
      },
      MIS_DEPOSIT_TRANSFER: {
        debitCode: '21001', // Savings Deposit Liability
        creditCode: '21005', // Monthly Income Scheme Liability
      },
      MIS_WITHDRAWAL: {
        debitCode: '21005', // Monthly Income Scheme Liability
        creditCode: '11001', // Cash In Hand
      },
      MIS_WITHDRAWAL_TRANSFER: {
        debitCode: '21005', // Monthly Income Scheme Liability
        creditCode: '21001', // Savings Deposit Liability
      },
      MIS_PAYOUT: {
        debitCode: '51001', // Interest Expenses
        creditCode: '11001', // Cash In Hand
      },
      MIS_PAYOUT_TRANSFER: {
        debitCode: '51001', // Interest Expenses
        creditCode: '21001', // Savings Deposit Liability
      },
    };
    return rules[transactionType] || null;
  }
}

const accountingRulesServiceInstance = new AccountingRulesService();
export default accountingRulesServiceInstance;
export { accountingRulesServiceInstance as AccountingRulesServiceInstance };
