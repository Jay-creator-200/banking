import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Self-contained .env loader to read MongoDB credentials outside Next.js process
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if present
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
  console.warn('Could not load .env file directly:', e);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

// Side-effect model registration to match project pattern
import AccountHead from '../models/AccountHead.js';

const coaNodes = [
  // 1. Root Levels
  { name: 'Assets', code: '10000', type: 'ASSET', parentCode: null },
  { name: 'Liabilities', code: '20000', type: 'LIABILITY', parentCode: null },
  { name: 'Equity', code: '30000', type: 'EQUITY', parentCode: null },
  { name: 'Income', code: '40000', type: 'INCOME', parentCode: null },
  { name: 'Expenses', code: '50000', type: 'EXPENSE', parentCode: null },

  // 2. Asset Subgroups
  { name: 'Cash and Bank Balances', code: '11000', type: 'ASSET', parentCode: '10000' },
  { name: 'Cash in Hand', code: '11001', type: 'ASSET', parentCode: '11000' },
  { name: 'Cash at Bank', code: '11002', type: 'ASSET', parentCode: '11000' },
  { name: 'Loan Receivables', code: '12000', type: 'ASSET', parentCode: '10000' },
  { name: 'Loan Outstanding Ledger', code: '12001', type: 'ASSET', parentCode: '12000' },

  // 3. Liability Subgroups
  { name: 'Deposits Liabilities', code: '21000', type: 'LIABILITY', parentCode: '20000' },
  { name: 'Savings Deposit Liability', code: '21001', type: 'LIABILITY', parentCode: '21000' },
  { name: 'Recurring Deposit Liability', code: '21002', type: 'LIABILITY', parentCode: '21000' },
  { name: 'Fixed Deposit Liability', code: '21003', type: 'LIABILITY', parentCode: '21000' },
  { name: 'Daily Deposit Liability', code: '21004', type: 'LIABILITY', parentCode: '21000' },
  { name: 'Monthly Investment Scheme Liability', code: '21005', type: 'LIABILITY', parentCode: '21000' },

  // 4. Equity Subgroups
  { name: 'Share Capital Outstanding', code: '31001', type: 'EQUITY', parentCode: '30000' },
  { name: 'Opening Balance Equity', code: '31002', type: 'EQUITY', parentCode: '30000' },

  // 5. Income Subgroups
  { name: 'Operating Income', code: '41000', type: 'INCOME', parentCode: '40000' },
  { name: 'Interest Income Ledger', code: '41001', type: 'INCOME', parentCode: '41000' },
  { name: 'Penalty Income Ledger', code: '41002', type: 'INCOME', parentCode: '41000' },
  { name: 'Membership Fees Income', code: '41003', type: 'INCOME', parentCode: '41000' },

  // 6. Expense Subgroups
  { name: 'Operating Expenses', code: '51000', type: 'EXPENSE', parentCode: '50000' },
  { name: 'Interest Expenses Ledger', code: '51001', type: 'EXPENSE', parentCode: '51000' },
  { name: 'Write-off Expense Ledger', code: '51002', type: 'EXPENSE', parentCode: '51000' },
  { name: 'Staff Salary Expense', code: '51003', type: 'EXPENSE', parentCode: '51000' },
];

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully. Seeding Chart of Accounts...');

    const codesMap = {};

    for (const node of coaNodes) {
      let parentId = null;
      if (node.parentCode) {
        const parentDoc = codesMap[node.parentCode];
        if (parentDoc) {
          parentId = parentDoc._id;
        } else {
          // Fallback search database
          const foundParent = await AccountHead.findOne({ code: node.parentCode });
          if (foundParent) parentId = foundParent._id;
        }
      }

      const doc = await AccountHead.findOneAndUpdate(
        { code: node.code },
        {
          name: node.name,
          type: node.type,
          parentAccountId: parentId,
          status: 'ACTIVE',
          isDeleted: false,
        },
        { upsert: true, returnDocument: 'after' }
      );
      
      codesMap[node.code] = doc;
      console.log(`Upserted Account Head: [${doc.code}] ${doc.name}`);
    }

    console.log('=== CHART OF ACCOUNTS SEEDING SUCCESSFUL ===');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL: Seeding failed:', err);
    process.exit(1);
  }
}

seed();
