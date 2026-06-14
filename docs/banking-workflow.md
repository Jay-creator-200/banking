# Cooperative Banking Workflow Documentation

This document describes the key functional workflows, rules, and accounting engine patterns implemented within the Cooperative Banking Software.

---

## 1. Member Lifecycle & Deposits

### Member Registration & Savings Account Auto-Opening
1. **Demographic Enrollment**: Employees register a new member profile (Aadhaar, PAN, contact, district, category).
2. **Auto Savings Account Creation**: 
   - Upon successful member registration, the system automatically runs a transactional hook to open a primary Savings Account (`SAV-JPR-YYYY-XXXXXX`).
   - For auto-creation, standard KYC checks are bypassed (`isAutoCreate: true`) to ensure seamless onboarding.
   - If the database transaction fails at any stage, both member creation and account opening are rolled back.
3. **Manual Savings Account Creation**:
   - Employees can manually open a savings account for any member.
   - To assist user flow, member search supports partial name/mobile filtering and displays clean strings rather than `[object Object]` references.
   - Manual creation relaxes KYC checks to accept both `verified` and `pending` members.

---

## 2. Teller Operations & Dual-Control Approvals

### Cash Sessions & Tellers
- All cash deposits and withdrawals require an active Cash Teller Session. Tellers must open a session with their drawer balance, log denominations, and close sessions daily.

### Maker-Checker Withdrawal Limits
- **Threshold Rule**: Any savings account withdrawal exceeding **₹50,000** triggers a pending transaction state and requires dual control authorization.
- **Checker Authorization**:
  - The transaction must be approved by a Checker who was NOT the maker (Self-approval is blocked).
  - Valid Checker roles include `MANAGER` (Branch Manager), `ADMIN` (System Admin), or `SUPER_ADMIN`.
  - Once approved, the transaction is finalized, and ledgers are balanced.

---

## 3. Loan Account Management & Scheduling

### Product Configurations
- **Product Rules**: Loan products define minimum/maximum amounts, tenures, processing fees (percentage/fixed), and whether they require collaterals or guarantors.
- **Amortization Methods**:
  - **Flat Interest**: Interest is calculated on the initial principal for the entire tenure. Monthly EMI is constant, with equal principal and interest portions:
    $$\text{Total Interest} = \frac{P \times R \times N}{100}$$
  - **Reducing Balance**: Interest is calculated on the outstanding monthly principal:
    $$\text{EMI} = \frac{P \times r \times (1+r)^N}{(1+r)^N - 1} \quad \text{where } r = \frac{\text{Annual Rate}}{12 \times 100}$$

### Disbursement & Repayment Posting
- **Disbursement**: Disbursement creates the active Loan account, generates the full EMI schedule row-by-row, and posts the payment:
  - **Debit**: Loan Outstanding Ledger (`12001`)
  - **Credit**: Cash in Hand (`11001`) or Account Credit (`21001`)
- **EMI Repayment**:
  - Cashier collects EMI payment, which is auto-allocated across outstanding penalty, interest, and principal.
  - Generates balanced double-entry accounting lines:
    - **Debit**: Cash in Hand (`11001`) - Full Amount
    - **Credit**: Loan Outstanding Ledger (`12001`) - Principal portion
    - **Credit**: Interest Income (`41001`) - Interest portion
    - **Credit**: Penalty Income (`41002`) - Penalty portion (if any)

---

## 4. Ledger & Accounting Engine

Every financial action generates a **Journal Voucher (JV)** and corresponding double-entry **Ledger Entries**. 
The ledger matching resolves to numerical Chart of Accounts (COA) heads:

| Account Code | Account Name | Type | Purpose |
|---|---|---|---|
| **11001** | Cash in Hand | Asset | Vault & teller drawer cash |
| **12001** | Loan Outstanding Ledger | Asset | Unrecovered principal balances |
| **21001** | Savings Deposit Liability | Liability | Customer savings deposit balances |
| **41001** | Interest Income Ledger | Income | Earned interest on loans |
| **41002** | Penalty Income Ledger | Income | Penalties collected on defaults |
| **51002** | Write-off Expense Ledger | Expense | Expensed bad loans write-offs |
