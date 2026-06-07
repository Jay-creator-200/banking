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
    };
    return rules[transactionType] || null;
  }
}

const accountingRulesServiceInstance = new AccountingRulesService();
export default accountingRulesServiceInstance;
export { accountingRulesServiceInstance as AccountingRulesServiceInstance };
