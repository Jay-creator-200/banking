import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Self-contained .env loader
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('Could not read .env file manually:', e);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

// Import Services
import financialReportService from '../src/services/FinancialReportService.js';
import closingService from '../src/services/ClosingService.js';
import reconciliationService from '../src/services/ReconciliationService.js';
import ledgerService from '../src/services/LedgerService.js';

// Import Models
import Branch from '../src/models/Branch.js';
import LedgerEntry from '../src/models/LedgerEntry.js';
import Transaction from '../src/models/Transaction.js';
import AccountHead from '../src/models/AccountHead.js';
import BusinessDayClosing from '../src/models/BusinessDayClosing.js';
import BankReconciliation from '../src/models/BankReconciliation.js';

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Starting Phase 8 automated test suite...\n');

  let branch = await Branch.findOne({ branchCode: 'JPR' });
  if (!branch) {
    console.error('Jaipur branch JPR not found. Please seed data first.');
    process.exit(1);
  }
  const branchId = branch._id.toString();

  // Reset business date to ensure fresh start for testing
  await Branch.updateOne({ _id: branchId }, { $set: { currentBusinessDate: new Date('2026-06-15') } });
  branch = await Branch.findById(branchId); // reload

  let passed = true;

  // ==========================================
  // SCENARIO 1: TRIAL BALANCE
  // ==========================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 1: Generate Trial Balance...');
    const result = await financialReportService.getTrialBalance({ branchId });
    console.log(`Total Debits: ₹${result.totalDebits}`);
    console.log(`Total Credits: ₹${result.totalCredits}`);
    console.log(`Is Balanced? ${result.isBalanced}`);

    if (!result.isBalanced) {
      throw new Error(`Trial Balance is not balanced! Difference: ₹${Math.abs(result.totalDebits - result.totalCredits)}`);
    }
    console.log('✓ Scenario 1 PASSED: Total Debits == Total Credits.');
  } catch (err) {
    console.error('✗ Scenario 1 FAILED:', err.message);
    passed = false;
  }

  // ==========================================
  // SCENARIO 2: BALANCE SHEET
  // ==========================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 2: Generate Balance Sheet...');
    const result = await financialReportService.getBalanceSheet({ branchId });
    console.log(`Assets Total: ₹${result.assetsTotal}`);
    console.log(`Liabilities Total: ₹${result.liabilitiesTotal}`);
    console.log(`Equity Total: ₹${result.equityTotal}`);
    console.log(`Assets - (Liabilities + Equity) = ₹${result.difference}`);

    if (Math.abs(result.difference) >= 0.01) {
      throw new Error(`Balance Sheet does not balance! Assets total must equal Liabilities + Equity.`);
    }
    console.log('✓ Scenario 2 PASSED: Assets == Liabilities + Equity.');
  } catch (err) {
    console.error('✗ Scenario 2 FAILED:', err.message);
    passed = false;
  }

  // ==========================================
  // SCENARIO 3: PROFIT & LOSS STATEMENT
  // ==========================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 3: Generate Profit & Loss Statement...');
    const result = await financialReportService.getProfitLoss({ branchId });
    console.log(`Total Income: ₹${result.totalIncome}`);
    console.log(`Total Expense: ₹${result.totalExpense}`);
    console.log(`Calculated Net Profit/Loss: ₹${result.netProfitLoss}`);

    const verifiedNet = Math.round((result.totalIncome - result.totalExpense) * 100) / 100;
    if (result.netProfitLoss !== verifiedNet) {
      throw new Error(`Net Profit/Loss calculation discrepancy! Found: ${result.netProfitLoss}, Expected: ${verifiedNet}`);
    }
    console.log('✓ Scenario 3 PASSED: Income - Expense == Net Profit/Loss.');
  } catch (err) {
    console.error('✗ Scenario 3 FAILED:', err.message);
    passed = false;
  }

  // ==========================================
  // SCENARIO 4: CLOSE BUSINESS DAY & TRANSACTION LOCK
  // ==========================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 4: Close Business Day and verify Transaction Locking...');
    
    // Save original business date
    const originalDate = branch.currentBusinessDate;
    console.log(`Current Business Date before closing: ${originalDate.toLocaleDateString()}`);

    // Clean up any legacy pending/draft transactions to ensure day end checks can proceed
    await Transaction.deleteMany({ branchId, status: { $in: ['PENDING', 'DRAFT'] } });

    // Clean up any previous closing for today to prevent index conflicts
    await BusinessDayClosing.deleteMany({ branchId, date: originalDate });

    // Execute day closing
    const closingRecord = await closingService.closeBusinessDay({
      branchId,
      userId: 'TEST-OPERATOR',
    });

    console.log(`Day End Closed successfully. Status: ${closingRecord.status}`);
    
    // Fetch refreshed branch
    const updatedBranch = await Branch.findById(branchId);
    console.log(`New Business Date after closing: ${updatedBranch.currentBusinessDate.toLocaleDateString()}`);

    // Assert locking: Attempt posting voucher on the closed date
    console.log('Attempting to post a voucher on the locked/closed business date...');
    const cashHead = await AccountHead.findOne({ code: '11001' });
    const savingsHead = await AccountHead.findOne({ code: '21001' });

    let lockAsserted = false;
    try {
      await ledgerService.createVoucher({
        voucherDate: originalDate, // closed date
        voucherType: 'RECEIPT',
        branchId,
        narration: 'Asserting Transaction Lock',
        entries: [
          { accountHeadId: cashHead._id, debit: 100, credit: 0 },
          { accountHeadId: savingsHead._id, debit: 0, credit: 100 }
        ]
      }, 'TEST-OPERATOR');
    } catch (e) {
      console.log(`Lock check correctly caught expected error: ${e.message}`);
      lockAsserted = true;
    }

    // Restore original business date in database to keep demo operational
    await Branch.updateOne({ _id: branchId }, { $set: { currentBusinessDate: originalDate } });
    await BusinessDayClosing.deleteOne({ _id: closingRecord._id });
    console.log('Restored original business date.');

    if (!lockAsserted) {
      throw new Error('Locking failed: System allowed posting transactions on a closed business date!');
    }
    console.log('✓ Scenario 4 PASSED: Transactions successfully locked on closed dates.');
  } catch (err) {
    console.error('✗ Scenario 4 FAILED:', err.message);
    passed = false;
  }

  // ==========================================
  // SCENARIO 5: BANK RECONCILIATION MATCHING
  // ==========================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 5: Bank Reconciliation statement matching...');

    // Resolve cash head
    const cashBankHead = await AccountHead.findOne({ code: '11002' }); // SBI Bank
    
    // Let's insert a ledger entry for a netbanking transfer of 1500 to match the statement
    // First, let's create a fake Transaction and Voucher for ₹1,500
    const dummyTx = await Transaction.create({
      transactionNo: `TXN-RECON-MATCH-${Date.now()}`,
      branchId,
      accountType: 'savings',
      accountId: 'SAV-MATCH-001',
      transactionType: 'SAVINGS_DEPOSIT',
      paymentMode: 'TRANSFER', // Use valid enum value
      amount: 1500,
      status: 'POSTED',
      approvedAt: new Date('2026-06-15'),
    });

    const dummyVoucher = await ledgerService.createVoucher({
      voucherDate: new Date('2026-06-15'),
      voucherType: 'RECEIPT',
      branchId,
      narration: 'Seed reconciliation Netbanking Deposit',
      entries: [
        { accountHeadId: cashBankHead._id, debit: 1500, credit: 0 },
        { accountHeadId: await AccountHead.findOne({ code: '21001' }).then(h => h._id), debit: 0, credit: 1500 }
      ]
    }, 'SYSTEM');

    // Link transaction to ledger entries
    await LedgerEntry.updateMany({ voucherId: dummyVoucher._id }, { $set: { transactionId: dummyTx._id } });

    // Now upload statement containing a credit of 1500
    console.log('Uploading bank statement CSV rows containing ₹1,500 Netbanking credit...');
    const csvRows = [
      { date: '2026-06-15', description: 'Netbanking Deposit Net-Trf-0087', refNo: 'NET-TRF-0087', debit: 0, credit: 1500 },
      { date: '2026-06-15', description: 'Unknown Outflow', refNo: 'UNKNOWN-0928', debit: 800, credit: 0 }
    ];

    const recon = await reconciliationService.uploadStatement({
      bankAccount: 'SBI-987654321',
      statementDate: new Date('2026-06-15'),
      openingBalance: 100000,
      closingBalance: 100700,
      csvRows,
      userId: 'SYSTEM'
    });

    console.log(`Reconciliation processed. Total lines: ${recon.transactions.length}`);
    const matchedLine = recon.transactions.find(t => t.credit === 1500);
    const unmatchedLine = recon.transactions.find(t => t.debit === 800);

    console.log(`Line 1 (₹1,500 Credit) status: ${matchedLine.status}`);
    console.log(`Line 2 (₹800 Debit) status: ${unmatchedLine.status}`);

    if (matchedLine.status !== 'Matched' || unmatchedLine.status !== 'Unmatched') {
      throw new Error(`Auto-matching did not match rows correctly. Line 1: ${matchedLine.status}, Line 2: ${unmatchedLine.status}`);
    }

    // Clean up dummy matches
    await Transaction.deleteOne({ _id: dummyTx._id });
    await LedgerEntry.deleteMany({ voucherId: dummyVoucher._id });
    await mongoose.model('JournalVoucher').deleteOne({ _id: dummyVoucher._id });
    await BankReconciliation.deleteOne({ _id: recon._id });

    console.log('✓ Scenario 5 PASSED: Reconciliation matched transaction and left unmatched as open.');
  } catch (err) {
    console.error('✗ Scenario 5 FAILED:', err.message);
    passed = false;
  }

  console.log('----------------------------------------------------');
  if (passed) {
    console.log('ALL SCENARIOS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.log('SOME SCENARIOS FAILED.');
    process.exit(1);
  }
}

runTests();
