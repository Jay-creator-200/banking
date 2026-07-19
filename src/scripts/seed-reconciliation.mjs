import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Self-contained .env loader to read MongoDB credentials
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

import AccountHead from '../models/AccountHead.js';
import Branch from '../models/Branch.js';
import Expense from '../models/Expense.js';
import IncomeEntry from '../models/IncomeEntry.js';
import Budget from '../models/Budget.js';
import BankReconciliation from '../models/BankReconciliation.js';
import User from '../models/User.js';
import JournalVoucher from '../models/JournalVoucher.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Transaction from '../models/Transaction.js';
import ApprovalRequest from '../models/ApprovalRequest.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

async function seedAdvancedAccounting() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connection successful.');

    // 1. Resolve Branch
    const branch = await Branch.findOne({ branchCode: 'NCS-JP-001' });
    if (!branch) {
      console.error('Jaipur branch not found. Run seed-demo.mjs first.');
      process.exit(1);
    }
    const branchId = branch._id;

    // 2. Register detailed Account Heads if missing
    console.log('Upserting advanced Account Heads...');
    
    // Expenses
    const salaryHead = await AccountHead.findOneAndUpdate(
      { code: '51003' },
      { name: 'Salary Expenses', type: 'EXPENSE', parentAccountId: await AccountHead.findOne({ code: '51000' }).then(h => h?._id || null), status: 'ACTIVE', isDeleted: false },
      { upsert: true, new: true }
    );
    const adminHead = await AccountHead.findOneAndUpdate(
      { code: '51004' },
      { name: 'Administrative Expenses', type: 'EXPENSE', parentAccountId: await AccountHead.findOne({ code: '51000' }).then(h => h?._id || null), status: 'ACTIVE', isDeleted: false },
      { upsert: true, new: true }
    );
    
    // Incomes
    const processingFeesHead = await AccountHead.findOneAndUpdate(
      { code: '41004' },
      { name: 'Processing Fees Income', type: 'INCOME', parentAccountId: await AccountHead.findOne({ code: '41000' }).then(h => h?._id || null), status: 'ACTIVE', isDeleted: false },
      { upsert: true, new: true }
    );
    const otherIncomeHead = await AccountHead.findOneAndUpdate(
      { code: '41005' },
      { name: 'Other Income Ledger', type: 'INCOME', parentAccountId: await AccountHead.findOne({ code: '41000' }).then(h => h?._id || null), status: 'ACTIVE', isDeleted: false },
      { upsert: true, new: true }
    );

    console.log('Account heads verified.');

    // 3. Clean and Seed Budget allocations
    console.log('Seeding Budget configurations...');
    await Budget.deleteMany({ branchId });
    
    await Budget.create([
      { fiscalYear: '2026-2027', branchId, department: 'Operations', accountHeadId: adminHead._id, allocatedAmount: 120000 },
      { fiscalYear: '2026-2027', branchId, department: 'HR', accountHeadId: salaryHead._id, allocatedAmount: 500000 },
      { fiscalYear: '2026-2027', branchId, department: 'IT Support', accountHeadId: adminHead._id, allocatedAmount: 80000 },
    ]);
    console.log('Budgets seeded successfully.');

    // Find a valid user to act as creator
    const staffUser = await mongoose.model('User').findOne({ branchId });
    const creatorId = staffUser ? staffUser._id.toString() : new mongoose.Types.ObjectId().toString();

    console.log(`Using User ID ${creatorId} as creator for seed entries.`);

    // 4. Seed Expenses
    console.log('Seeding Expenses...');
    await Expense.deleteMany({ branchId });
    
    // Clean existing approvals of module EXPENSE to avoid stale data
    await mongoose.model('ApprovalRequest').deleteMany({ moduleName: 'EXPENSE' });
    
    const expenseService = (await import('../services/ExpenseService.js')).default;
    
    const exp1 = await expenseService.createExpense({
      branchId,
      category: 'Utilities',
      amount: 4500,
      paymentMode: 'CASH',
      vendor: 'Jaipur Electricity Board',
      description: 'May Electricity Bill Payment',
      accountHeadId: adminHead._id,
    }, creatorId);
    
    const exp2 = await expenseService.createExpense({
      branchId,
      category: 'Rent',
      amount: 25000,
      paymentMode: 'BANK',
      vendor: 'Apex Mall Landlord',
      description: 'Branch Monthly Office Rental',
      accountHeadId: adminHead._id,
    }, creatorId);

    console.log(`Seeded Expenses: ${exp1.expenseNo}, ${exp2.expenseNo}`);

    // 5. Seed Income entries
    console.log('Seeding Income entries...');
    await IncomeEntry.deleteMany({ branchId });
    
    const incomeService = (await import('../services/IncomeService.js')).default;
    
    const inc1 = await incomeService.createIncome({
      branchId,
      category: 'Fees',
      amount: 1500,
      paymentMode: 'CASH',
      receivedFrom: 'Harish Bhat',
      description: 'Cooperative share certification issuance fees',
      accountHeadId: processingFeesHead._id,
    }, creatorId);

    const inc2 = await incomeService.createIncome({
      branchId,
      category: 'Other Income',
      amount: 800,
      paymentMode: 'CASH',
      receivedFrom: 'Sunita Devi',
      description: 'Locker registration charges',
      accountHeadId: otherIncomeHead._id,
    }, creatorId);

    console.log(`Seeded Income Entries: ${inc1.incomeNo}, ${inc2.incomeNo}`);

    // 6. Seed Bank Reconciliation Statement
    console.log('Seeding Bank statement logs...');
    await BankReconciliation.deleteMany({});
    
    // We will seed a statement for SBI bank Account with some unmatched transactions to test matching
    const statementDate = new Date('2026-06-15');
    await BankReconciliation.create({
      bankAccount: 'SBI-987654321',
      statementDate,
      openingBalance: 200000,
      closingBalance: 176300,
      transactions: [
        { date: new Date('2026-06-12'), description: 'ATM Cash Replenishment Withdrawal', refNo: 'SBI-ATM-1002', debit: 20000, credit: 0, status: 'Unmatched' },
        { date: new Date('2026-06-14'), description: 'Online Deposit Netbanking Transfer', refNo: 'NET-TRF-0087', debit: 0, credit: 1500, status: 'Unmatched' },
        { date: new Date('2026-06-15'), description: 'Monthly Office Rental Payment', refNo: 'RENT-MAY-2026', debit: 25000, credit: 0, status: 'Unmatched' },
      ],
      createdBy: 'SYSTEM',
      updatedBy: 'SYSTEM',
    });
    console.log('Bank statement logs seeded.');

    console.log('=== ADVANCED ACCOUNTING SEEDING COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
}

seedAdvancedAccounting();
