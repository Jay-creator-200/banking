import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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
  console.warn('Could not read .env file manually:', e);
}

// Override dns servers to bypass local SRV resolution blocks
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS override errors
}

// Import Mongoose Models (explicit relative JS paths for Node resolver)
import Branch from '../models/Branch.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import SavingsAccount from '../models/SavingsAccount.js';
import Transaction from '../models/Transaction.js';
import LoanProduct from '../models/LoanProduct.js';
import LoanApplication from '../models/LoanApplication.js';
import Loan from '../models/Loan.js';
import LoanSchedule from '../models/LoanSchedule.js';
import LoanPayment from '../models/LoanPayment.js';
import JournalVoucher from '../models/JournalVoucher.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AccountHead from '../models/AccountHead.js';
import DepositScheme from '../models/DepositScheme.js';
import RDAccount from '../models/RDAccount.js';
import RDInstallment from '../models/RDInstallment.js';
import FDAccount from '../models/FDAccount.js';
import DDSAccount from '../models/DDSAccount.js';
import DDSCollection from '../models/DDSCollection.js';
import MISAccount from '../models/MISAccount.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

async function seedDemoData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    const BRANCH_CODE = 'JPR';
    const BRANCH_NAME = 'Jaipur Main Branch';

    // 1. Clean up existing Jaipur branch data
    let branch = await Branch.findOne({ branchCode: BRANCH_CODE });
    if (branch) {
      console.log('Cleaning up existing Jaipur Branch data...');
      const branchId = branch._id;
      
      // Find members to clean up their details
      const memberIds = await Member.find({ branchId }).distinct('_id');
      const loanIds = await Loan.find({ branchId }).distinct('_id');

      await User.deleteMany({ branchId });
      await Member.deleteMany({ branchId });
      await SavingsAccount.deleteMany({ branchId });
      await Transaction.deleteMany({ branchId });
      await LoanApplication.deleteMany({ branchId });
      await Loan.deleteMany({ branchId });
      await LoanSchedule.deleteMany({ loanId: { $in: loanIds } });
      await LoanPayment.deleteMany({ loanId: { $in: loanIds } });
      await DepositScheme.deleteMany({});
      const rdAccIds = await RDAccount.find({ branchId }).distinct('_id');
      await RDAccount.deleteMany({ branchId });
      await RDInstallment.deleteMany({ rdAccountId: { $in: rdAccIds } });
      await FDAccount.deleteMany({ branchId });
      const ddsAccIds = await DDSAccount.find({ branchId }).distinct('_id');
      await DDSAccount.deleteMany({ branchId });
      await DDSCollection.deleteMany({ ddsAccountId: { $in: ddsAccIds } });
      await MISAccount.deleteMany({ branchId });
      await JournalVoucher.deleteMany({ branchId });
      await LedgerEntry.deleteMany({ branchId });
      await Branch.deleteOne({ _id: branchId });
      console.log('Cleanup completed.');
    }

    // 2. Create Jaipur Main Branch
    branch = await Branch.create({
      branchCode: BRANCH_CODE,
      branchName: BRANCH_NAME,
      address: '45, Apex Mall, Lal Kothi, Tonk Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302015',
      contactNumber: '0141-2740123',
      email: 'jaipur@noblebank.coop',
      status: 'ACTIVE',
      isDeleted: false
    });
    console.log(`Created Branch: ${branch.branchName} (${branch.branchCode})`);

    // 3. Load roles
    const roles = await Role.find({});
    const rolesMap = {};
    for (const r of roles) {
      rolesMap[r.code] = r;
    }
    if (!rolesMap['ADMIN'] || !rolesMap['MANAGER'] || !rolesMap['CASHIER'] || !rolesMap['LOAN_OFFICER']) {
      console.error('Required roles (ADMIN, MANAGER, CASHIER, LOAN_OFFICER) are missing. Run seed.mjs first.');
      process.exit(1);
    }

    // 4. Create 5 Staff Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecureP@ss1', salt);

    const staffUsersData = [
      {
        fullName: 'Jaipur Admin User',
        email: 'jaipur.admin@noblebank.coop',
        mobile: '9829012345',
        username: 'jaipur_admin',
        employeeCode: 'EMP-JPR-001',
        password: passwordHash,
        roleId: rolesMap['ADMIN']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'Jaipur Manager User',
        email: 'jaipur.manager@noblebank.coop',
        mobile: '9829023456',
        username: 'jaipur_manager',
        employeeCode: 'EMP-JPR-002',
        password: passwordHash,
        roleId: rolesMap['MANAGER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'Rajesh Sharma Cashier',
        email: 'jaipur.cashier1@noblebank.coop',
        mobile: '9829034567',
        username: 'cashier_raj',
        employeeCode: 'EMP-JPR-003',
        password: passwordHash,
        roleId: rolesMap['CASHIER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'Amit Patel Cashier',
        email: 'jaipur.cashier2@noblebank.coop',
        mobile: '9829045678',
        username: 'cashier_amit',
        employeeCode: 'EMP-JPR-004',
        password: passwordHash,
        roleId: rolesMap['CASHIER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'Priya Gupta Loan Officer',
        email: 'jaipur.loan@noblebank.coop',
        mobile: '9829056789',
        username: 'loanofficer_priya',
        employeeCode: 'EMP-JPR-005',
        password: passwordHash,
        roleId: rolesMap['LOAN_OFFICER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      }
    ];

    const seededStaff = [];
    for (const u of staffUsersData) {
      const userDoc = await User.create(u);
      seededStaff.push(userDoc);
      console.log(`Seeded user: ${userDoc.username}`);
    }

    // 5. Load Account Heads
    const heads = await AccountHead.find({});
    const headsMap = {};
    for (const h of heads) {
      headsMap[h.code] = h;
    }
    const cashHead = headsMap['11001'];
    const savingsHead = headsMap['21001'];
    const loanReceivableHead = headsMap['12001'];
    const interestIncomeHead = headsMap['41001'];
    const penaltyIncomeHead = headsMap['41002'];
    const writeoffExpenseHead = headsMap['51002'];

    if (!cashHead || !savingsHead || !loanReceivableHead || !interestIncomeHead || !penaltyIncomeHead || !writeoffExpenseHead) {
      console.error('Chart of accounts heads missing. Please run node src/scripts/seed-phase2.mjs first.');
      process.exit(1);
    }

    // 6. Create 3 Loan Products
    // Delete existing products to avoid conflicts
    await LoanProduct.deleteMany({});
    
    const loanProductsData = [
      {
        productCode: 'PL01',
        productName: 'Personal Loan',
        description: 'General purpose personal loan for salaried members',
        interestType: 'reducing',
        interestRate: 12.0,
        penaltyRate: 2.0,
        penaltyType: 'daily_percentage',
        processingFeeType: 'percentage',
        processingFeeValue: 1.0,
        minimumAmount: 10000,
        maximumAmount: 200000,
        minimumTenure: 3,
        maximumTenure: 24,
        requiresGuarantor: true,
        requiresCollateral: false,
        approvalLevels: 1,
        isActive: true
      },
      {
        productCode: 'GL01',
        productName: 'Gold Loan',
        description: 'Instant loan against gold ornaments and jewelry',
        interestType: 'flat',
        interestRate: 10.0,
        penaltyRate: 1.5,
        penaltyType: 'monthly_percentage',
        processingFeeType: 'fixed',
        processingFeeValue: 500,
        minimumAmount: 5000,
        maximumAmount: 500000,
        minimumTenure: 3,
        maximumTenure: 12,
        requiresGuarantor: false,
        requiresCollateral: true,
        approvalLevels: 1,
        isActive: true
      },
      {
        productCode: 'HL01',
        productName: 'Home Loan',
        description: 'Housing loan for house construction and purchase',
        interestType: 'reducing',
        interestRate: 8.5,
        penaltyRate: 2.5,
        penaltyType: 'daily_percentage',
        processingFeeType: 'percentage',
        processingFeeValue: 0.5,
        minimumAmount: 100000,
        maximumAmount: 5000000,
        minimumTenure: 12,
        maximumTenure: 180,
        requiresGuarantor: true,
        requiresCollateral: true,
        approvalLevels: 2,
        isActive: true
      }
    ];

    const seededProducts = {};
    for (const p of loanProductsData) {
      const prodDoc = await LoanProduct.create(p);
      seededProducts[p.productCode] = prodDoc;
      console.log(`Seeded loan product: ${prodDoc.productName}`);
    }

    // 7. Seed 20 Members + Savings Accounts + History
    const memberNames = [
      'Rajesh Sharma', 'Suresh Patel', 'Amit Verma', 'Priya Gupta', 'Vikram Singh',
      'Sunita Devi', 'Kavita Reddy', 'Manoj Kumar', 'Deepak Joshi', 'Sanjay Mehta',
      'Anita Rao', 'Rahul Jain', 'Neha Sharma', 'Ramesh Choudhary', 'Dinesh Yadav',
      'Pooja Mishra', 'Sandeep Gill', 'Arjun Nair', 'Jyoti Sen', 'Harish Bhat'
    ];

    const seededMembers = [];
    const seededSavingsAccounts = [];
    let txCount = 0;
    let jvCount = 0;

    async function postSavingsTransaction({ member, account, transactionType, amount, date, narration }) {
      txCount++;
      jvCount++;
      
      const txNo = `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`;
      const jvNo = `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`;
      const isDeposit = transactionType === 'SAVINGS_DEPOSIT';
      
      // Update account balances
      const oldBalance = account.currentBalance;
      const newBalance = isDeposit ? oldBalance + amount : oldBalance - amount;
      account.currentBalance = newBalance;
      account.availableBalance = newBalance;
      await account.save();
      
      // Create Transaction
      const transaction = await Transaction.create({
        transactionNo: txNo,
        branchId: branch._id,
        memberId: member._id,
        accountType: 'savings',
        accountId: account.accountNo,
        transactionType,
        paymentMode: 'CASH',
        amount,
        balanceAfter: newBalance,
        narration,
        status: 'POSTED',
        approvedBy: seededStaff[1]._id, // Approved by Jaipur Manager
        approvedAt: date,
        createdAt: date,
        updatedAt: date
      });
      
      // Create Journal Voucher
      const jv = await JournalVoucher.create({
        voucherNo: jvNo,
        voucherDate: date,
        voucherType: isDeposit ? 'RECEIPT' : 'PAYMENT',
        branchId: branch._id,
        narration,
        approvedBy: seededStaff[1]._id,
        createdAt: date,
        updatedAt: date
      });
      
      // Create Ledger Entries
      await LedgerEntry.create([
        {
          voucherId: jv._id,
          transactionId: transaction._id,
          accountHeadId: isDeposit ? cashHead._id : savingsHead._id,
          entryDate: date,
          debit: amount,
          credit: 0,
          branchId: branch._id,
          memberId: member._id,
          narration,
          createdBy: 'SYSTEM',
          createdAt: date,
          updatedAt: date
        },
        {
          voucherId: jv._id,
          transactionId: transaction._id,
          accountHeadId: isDeposit ? savingsHead._id : cashHead._id,
          entryDate: date,
          debit: 0,
          credit: amount,
          branchId: branch._id,
          memberId: member._id,
          narration,
          createdBy: 'SYSTEM',
          createdAt: date,
          updatedAt: date
        }
      ]);
    }

    console.log('Seeding 20 members and auto savings accounts...');
    for (let i = 0; i < memberNames.length; i++) {
      const name = memberNames[i];
      const memNo = `MBR-JPR-2026-${String(i + 1).padStart(6, '0')}`;
      const accNo = `SAV-JPR-2026-${String(i + 1).padStart(6, '0')}`;
      
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - (25 + i * 2)); // varying ages
      
      const member = await Member.create({
        memberNo: memNo,
        branchId: branch._id,
        membershipDate: new Date('2026-01-01'),
        fullName: name,
        fatherName: `${name.split(' ')[1] || 'Kumar'} Senior`,
        motherName: `Smt. ${name.split(' ')[0]} Mother`,
        dateOfBirth: dob,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        mobile: `98291${String(i + 1).padStart(5, '0')}`,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        occupation: i % 3 === 0 ? 'Business' : (i % 3 === 1 ? 'Salaried' : 'Farmer'),
        annualIncome: 150000 + (i * 20000),
        aadhaarNumber: `1234567890${String(i + 1).padStart(2, '0')}`,
        panNumber: `ABCDE${String(i + 1).padStart(4, '0')}A`,
        addressLine1: `House No ${10 + i}, Cooperative Colony`,
        city: 'Jaipur',
        state: 'Rajasthan',
        district: 'Jaipur',
        pincode: '302015',
        memberCategory: i % 5 === 1 ? 'senior_citizen' : (i % 5 === 2 ? 'staff' : 'general'),
        kycStatus: 'verified',
        memberStatus: 'active'
      });
      
      seededMembers.push(member);
      
      const accountType = i % 5 === 1 ? 'senior_citizen' : (i % 5 === 2 ? 'staff' : 'regular');
      const account = await SavingsAccount.create({
        accountNo: accNo,
        memberId: member._id,
        branchId: branch._id,
        openingDate: new Date('2026-01-01'),
        accountType,
        minimumBalance: 1000,
        interestRate: accountType === 'senior_citizen' ? 4.5 : (accountType === 'staff' ? 5.0 : 4.0),
        currentBalance: 0,
        availableBalance: 0,
        status: 'active'
      });
      
      seededSavingsAccounts.push(account);
      
      // Seeding transaction history
      const initialDeposit = 10000 + (i * 3000);
      await postSavingsTransaction({
        member,
        account,
        transactionType: 'SAVINGS_DEPOSIT',
        amount: initialDeposit,
        date: new Date('2026-01-01'),
        narration: 'Initial account opening deposit'
      });

      if (i % 3 !== 0) {
        await postSavingsTransaction({
          member,
          account,
          transactionType: 'SAVINGS_DEPOSIT',
          amount: 5000,
          date: new Date('2026-02-15'),
          narration: 'Cash deposit'
        });
      }

      if (i % 4 !== 0) {
        await postSavingsTransaction({
          member,
          account,
          transactionType: 'SAVINGS_WITHDRAWAL',
          amount: 3000,
          date: new Date('2026-03-20'),
          narration: 'Cash withdrawal'
        });
      }
    }
    console.log(`Seeded ${seededMembers.length} members with savings accounts and history.`);

    // 8. Seed Loans
    console.log('Seeding loan data...');

    // 8.1 Active Loan - Rajesh Sharma (index 0)
    // Personal Loan (PL01), Reducing, 12%, Principal 120,000, 12 months, disbursed Jan 1, 2026.
    // Reducing EMI = 10661.85. Total payable = 127942.20. Total interest = 7942.20.
    const memberRajesh = seededMembers[0];
    const productPL = seededProducts['PL01'];

    const appRajesh = await LoanApplication.create({
      applicationNo: 'LA-PL-2026-000001',
      memberId: memberRajesh._id,
      branchId: branch._id,
      loanProductId: productPL._id,
      requestedAmount: 120000,
      requestedTenureMonths: 12,
      purpose: 'Home renovation and medical expenses',
      applicationDate: new Date('2025-12-15'),
      applicationStatus: 'approved',
      approvedAmount: 120000,
      approvedTenure: 12,
      approvedBy: seededStaff[1]._id,
      approvedAt: new Date('2025-12-28'),
      processingFee: 1200
    });

    const loanRajesh = await Loan.create({
      loanNo: 'LN-JPR-2026-000001',
      memberId: memberRajesh._id,
      branchId: branch._id,
      loanProductId: productPL._id,
      applicationId: appRajesh._id,
      disbursementDate: new Date('2026-01-01'),
      principalAmount: 120000,
      interestRate: 12.0,
      interestType: 'reducing',
      tenureMonths: 12,
      emiAmount: 10661.85,
      totalInterest: 7942.20,
      totalPayable: 127942.20,
      outstandingPrincipal: 120000,
      outstandingInterest: 7942.20,
      overdueAmount: 0,
      nextDueDate: new Date('2026-02-01'),
      loanStatus: 'active',
      disbursementMode: 'CASH',
    });

    // Generate schedules
    let balance = 120000;
    const monthlyRate = 12.0 / (12 * 100);
    const schedulesRajesh = [];
    for (let m = 1; m <= 12; m++) {
      const interestDue = Math.round(balance * monthlyRate * 100) / 100;
      let principalDue = Math.round((10661.85 - interestDue) * 100) / 100;
      if (m === 12) principalDue = Math.round(balance * 100) / 100;
      const totalDue = Math.round((principalDue + interestDue) * 100) / 100;
      const closingPrincipal = Math.max(0, Math.round((balance - principalDue) * 100) / 100);

      const dueDate = new Date('2026-01-01');
      dueDate.setMonth(dueDate.getMonth() + m);

      const sched = await LoanSchedule.create({
        loanId: loanRajesh._id,
        installmentNo: m,
        dueDate,
        openingPrincipal: Math.round(balance * 100) / 100,
        principalDue,
        interestDue,
        totalDue,
        closingPrincipal,
        paidAmount: 0,
        principalPaid: 0,
        interestPaid: 0,
        paymentStatus: 'pending'
      });
      schedulesRajesh.push(sched);
      balance = closingPrincipal;
    }

    // Disbursement voucher postings
    jvCount++;
    const jvDisb = await JournalVoucher.create({
      voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
      voucherDate: new Date('2026-01-01'),
      voucherType: 'PAYMENT',
      branchId: branch._id,
      narration: `Disbursement of Loan ${loanRajesh.loanNo}`,
      approvedBy: seededStaff[1]._id
    });

    await LedgerEntry.create([
      {
        voucherId: jvDisb._id,
        accountHeadId: loanReceivableHead._id,
        entryDate: new Date('2026-01-01'),
        debit: 120000,
        credit: 0,
        branchId: branch._id,
        memberId: memberRajesh._id,
        narration: `Principal disbursed for loan ${loanRajesh.loanNo}`
      },
      {
        voucherId: jvDisb._id,
        accountHeadId: cashHead._id,
        entryDate: new Date('2026-01-01'),
        debit: 0,
        credit: 120000,
        branchId: branch._id,
        memberId: memberRajesh._id,
        narration: `Cash payment for loan disbursement ${loanRajesh.loanNo}`
      }
    ]);

    // Simulate 5 Paid EMIs (due on Feb 1, Mar 1, Apr 1, May 1, Jun 1)
    let totalPrincipalCollected = 0;
    let totalInterestCollected = 0;
    for (let k = 0; k < 5; k++) {
      const sched = schedulesRajesh[k];
      const payDate = new Date(sched.dueDate);
      payDate.setDate(payDate.getDate() - 2); // Paid slightly early

      sched.principalPaid = sched.principalDue;
      sched.interestPaid = sched.interestDue;
      sched.paidAmount = sched.totalDue;
      sched.paymentStatus = 'paid';
      sched.paidDate = payDate;
      await sched.save();

      totalPrincipalCollected += sched.principalDue;
      totalInterestCollected += sched.interestDue;

      // Post Payment Ledger entries
      txCount++;
      const txn = await Transaction.create({
        transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
        branchId: branch._id,
        memberId: memberRajesh._id,
        accountType: 'loan',
        accountId: loanRajesh.loanNo,
        transactionType: 'LOAN_INSTALLMENT',
        paymentMode: 'CASH',
        amount: sched.totalDue,
        status: 'POSTED',
        approvedBy: seededStaff[1]._id,
        approvedAt: payDate
      });

      jvCount++;
      const jvPay = await JournalVoucher.create({
        voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
        voucherDate: payDate,
        voucherType: 'RECEIPT',
        branchId: branch._id,
        narration: `EMI Payment Inst #${sched.installmentNo} for Loan ${loanRajesh.loanNo}`,
        approvedBy: seededStaff[1]._id
      });

      await LoanPayment.create({
        loanId: loanRajesh._id,
        scheduleId: sched._id,
        paymentDate: payDate,
        paymentMode: 'CASH',
        amount: sched.totalDue,
        principalCollected: sched.principalDue,
        interestCollected: sched.interestDue,
        transactionId: txn._id,
        voucherId: jvPay._id,
        receiptNo: `REC-PL-${String(txCount).padStart(6, '0')}`
      });

      await LedgerEntry.create([
        {
          voucherId: jvPay._id,
          transactionId: txn._id,
          accountHeadId: cashHead._id,
          entryDate: payDate,
          debit: sched.totalDue,
          credit: 0,
          branchId: branch._id,
          memberId: memberRajesh._id,
          narration: `Cash collection for Loan payment ${loanRajesh.loanNo}`
        },
        {
          voucherId: jvPay._id,
          transactionId: txn._id,
          accountHeadId: loanReceivableHead._id,
          entryDate: payDate,
          debit: 0,
          credit: sched.principalDue,
          branchId: branch._id,
          memberId: memberRajesh._id,
          narration: `Principal recovery for Loan ${loanRajesh.loanNo}`
        },
        {
          voucherId: jvPay._id,
          transactionId: txn._id,
          accountHeadId: interestIncomeHead._id,
          entryDate: payDate,
          debit: 0,
          credit: sched.interestDue,
          branchId: branch._id,
          memberId: memberRajesh._id,
          narration: `Interest income received on Loan ${loanRajesh.loanNo}`
        }
      ]);
    }

    // Update loan outstanding
    loanRajesh.outstandingPrincipal = 120000 - totalPrincipalCollected;
    loanRajesh.outstandingInterest = 7942.20 - totalInterestCollected;
    loanRajesh.nextDueDate = schedulesRajesh[5].dueDate; // July installment is next
    await loanRajesh.save();
    console.log(`Seeded Active Loan for ${memberRajesh.fullName}. Outstanding Principal: ₹${loanRajesh.outstandingPrincipal}`);


    // 8.2 Overdue Loan - Suresh Patel (index 1)
    // Gold Loan (GL01), Flat, 10%, Principal 50,000, 6 months, disbursed Jan 1, 2026.
    // Flat EMI = 8750. Total payable = 52500. Total interest = 2500.
    // All EMIs unpaid (Feb 1, Mar 1, Apr 1, May 1, Jun 1). Marked overdue.
    const memberSuresh = seededMembers[1];
    const productGL = seededProducts['GL01'];

    const appSuresh = await LoanApplication.create({
      applicationNo: 'LA-GL-2026-000002',
      memberId: memberSuresh._id,
      branchId: branch._id,
      loanProductId: productGL._id,
      requestedAmount: 50000,
      requestedTenureMonths: 6,
      purpose: 'Emergency funds for business liquidity',
      applicationDate: new Date('2025-12-20'),
      applicationStatus: 'approved',
      approvedAmount: 50000,
      approvedTenure: 6,
      approvedBy: seededStaff[1]._id,
      approvedAt: new Date('2025-12-29'),
      processingFee: 500
    });

    const loanSuresh = await Loan.create({
      loanNo: 'LN-JPR-2026-000002',
      memberId: memberSuresh._id,
      branchId: branch._id,
      loanProductId: productGL._id,
      applicationId: appSuresh._id,
      disbursementDate: new Date('2026-01-01'),
      principalAmount: 50000,
      interestRate: 10.0,
      interestType: 'flat',
      tenureMonths: 6,
      emiAmount: 8750,
      totalInterest: 2500,
      totalPayable: 52500,
      outstandingPrincipal: 50000,
      outstandingInterest: 2500,
      overdueAmount: 8750 * 5, // 5 installments overdue
      nextDueDate: new Date('2026-02-01'),
      loanStatus: 'overdue',
      disbursementMode: 'CASH',
    });

    // Generate schedules as overdue
    const flatInterestPerPeriod = 2500 / 6;
    const flatPrincipalPerPeriod = 50000 / 6;
    for (let m = 1; m <= 6; m++) {
      const dueDate = new Date('2026-01-01');
      dueDate.setMonth(dueDate.getMonth() + m);

      // Past schedules are marked overdue
      const isPast = dueDate < new Date();

      await LoanSchedule.create({
        loanId: loanSuresh._id,
        installmentNo: m,
        dueDate,
        openingPrincipal: 50000 - (m - 1) * flatPrincipalPerPeriod,
        principalDue: flatPrincipalPerPeriod,
        interestDue: flatInterestPerPeriod,
        totalDue: 8750,
        closingPrincipal: 50000 - m * flatPrincipalPerPeriod,
        paidAmount: 0,
        principalPaid: 0,
        interestPaid: 0,
        paymentStatus: isPast ? 'overdue' : 'pending'
      });
    }

    // Disbursement postings Suresh
    jvCount++;
    const jvDisbSuresh = await JournalVoucher.create({
      voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
      voucherDate: new Date('2026-01-01'),
      voucherType: 'PAYMENT',
      branchId: branch._id,
      narration: `Disbursement of Loan ${loanSuresh.loanNo}`,
      approvedBy: seededStaff[1]._id
    });

    await LedgerEntry.create([
      {
        voucherId: jvDisbSuresh._id,
        accountHeadId: loanReceivableHead._id,
        entryDate: new Date('2026-01-01'),
        debit: 50000,
        credit: 0,
        branchId: branch._id,
        memberId: memberSuresh._id,
        narration: `Principal disbursed for gold loan ${loanSuresh.loanNo}`
      },
      {
        voucherId: jvDisbSuresh._id,
        accountHeadId: cashHead._id,
        entryDate: new Date('2026-01-01'),
        debit: 0,
        credit: 50000,
        branchId: branch._id,
        memberId: memberSuresh._id,
        narration: `Cash payment for gold loan disbursement ${loanSuresh.loanNo}`
      }
    ]);
    console.log(`Seeded Overdue Loan for ${memberSuresh.fullName}. Overdue amount: ₹${loanSuresh.overdueAmount}`);


    // 8.3 Closed Loan - Amit Verma (index 2)
    // Personal Loan (PL01), Reducing, 12%, Principal 30,000, 3 months, disbursed Jan 1, 2026.
    // Fully paid by April 1, 2026.
    const memberAmit = seededMembers[2];

    const appAmit = await LoanApplication.create({
      applicationNo: 'LA-PL-2026-000003',
      memberId: memberAmit._id,
      branchId: branch._id,
      loanProductId: productPL._id,
      requestedAmount: 30000,
      requestedTenureMonths: 3,
      purpose: 'Buy laptops for education support',
      applicationDate: new Date('2025-12-10'),
      applicationStatus: 'approved',
      approvedAmount: 30000,
      approvedTenure: 3,
      approvedBy: seededStaff[1]._id,
      approvedAt: new Date('2025-12-25'),
      processingFee: 300
    });

    const emiAmit = 10201.34;
    const interestAmit = 604.02;
    const loanAmit = await Loan.create({
      loanNo: 'LN-JPR-2026-000003',
      memberId: memberAmit._id,
      branchId: branch._id,
      loanProductId: productPL._id,
      applicationId: appAmit._id,
      disbursementDate: new Date('2026-01-01'),
      principalAmount: 30000,
      interestRate: 12.0,
      interestType: 'reducing',
      tenureMonths: 3,
      emiAmount: emiAmit,
      totalInterest: interestAmit,
      totalPayable: 30604.02,
      outstandingPrincipal: 0,
      outstandingInterest: 0,
      overdueAmount: 0,
      nextDueDate: null,
      loanStatus: 'closed',
      disbursementMode: 'CASH',
      closedAt: new Date('2026-04-01')
    });

    // Create schedule and paid transactions
    let balAmit = 30000;
    for (let m = 1; m <= 3; m++) {
      const interestDue = Math.round(balAmit * monthlyRate * 100) / 100;
      let principalDue = Math.round((emiAmit - interestDue) * 100) / 100;
      if (m === 3) principalDue = Math.round(balAmit * 100) / 100;
      const totalDue = Math.round((principalDue + interestDue) * 100) / 100;
      const closingPrincipal = Math.max(0, Math.round((balAmit - principalDue) * 100) / 100);

      const dueDate = new Date('2026-01-01');
      dueDate.setMonth(dueDate.getMonth() + m);

      const sched = await LoanSchedule.create({
        loanId: loanAmit._id,
        installmentNo: m,
        dueDate,
        openingPrincipal: Math.round(balAmit * 100) / 100,
        principalDue,
        interestDue,
        totalDue,
        closingPrincipal,
        paidAmount: totalDue,
        principalPaid: principalDue,
        interestPaid: interestDue,
        paymentStatus: 'paid',
        paidDate: dueDate
      });

      // Post payments postings
      txCount++;
      const txn = await Transaction.create({
        transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
        branchId: branch._id,
        memberId: memberAmit._id,
        accountType: 'loan',
        accountId: loanAmit.loanNo,
        transactionType: 'LOAN_INSTALLMENT',
        paymentMode: 'CASH',
        amount: totalDue,
        status: 'POSTED',
        approvedBy: seededStaff[1]._id,
        approvedAt: dueDate
      });

      jvCount++;
      const jvPay = await JournalVoucher.create({
        voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
        voucherDate: dueDate,
        voucherType: 'RECEIPT',
        branchId: branch._id,
        narration: `EMI Payment Inst #${m} for Loan ${loanAmit.loanNo}`,
        approvedBy: seededStaff[1]._id
      });

      await LoanPayment.create({
        loanId: loanAmit._id,
        scheduleId: sched._id,
        paymentDate: dueDate,
        paymentMode: 'CASH',
        amount: totalDue,
        principalCollected: principalDue,
        interestCollected: interestDue,
        transactionId: txn._id,
        voucherId: jvPay._id,
        receiptNo: `REC-PL-${String(txCount).padStart(6, '0')}`
      });

      await LedgerEntry.create([
        {
          voucherId: jvPay._id,
          transactionId: txn._id,
          accountHeadId: cashHead._id,
          entryDate: dueDate,
          debit: totalDue,
          credit: 0,
          branchId: branch._id,
          memberId: memberAmit._id,
          narration: `Cash collection for Loan payment ${loanAmit.loanNo}`
        },
        {
          voucherId: jvPay._id,
          transactionId: txn._id,
          accountHeadId: loanReceivableHead._id,
          entryDate: dueDate,
          debit: 0,
          credit: principalDue,
          branchId: branch._id,
          memberId: memberAmit._id,
          narration: `Principal recovery for Loan ${loanAmit.loanNo}`
        },
        {
          voucherId: jvPay._id,
          transactionId: txn._id,
          accountHeadId: interestIncomeHead._id,
          entryDate: dueDate,
          debit: 0,
          credit: interestDue,
          branchId: branch._id,
          memberId: memberAmit._id,
          narration: `Interest income received on Loan ${loanAmit.loanNo}`
        }
      ]);

      balAmit = closingPrincipal;
    }

    // Disbursement voucher postings for Amit
    jvCount++;
    const jvDisbAmit = await JournalVoucher.create({
      voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
      voucherDate: new Date('2026-01-01'),
      voucherType: 'PAYMENT',
      branchId: branch._id,
      narration: `Disbursement of Loan ${loanAmit.loanNo}`,
      approvedBy: seededStaff[1]._id
    });

    await LedgerEntry.create([
      {
        voucherId: jvDisbAmit._id,
        accountHeadId: loanReceivableHead._id,
        entryDate: new Date('2026-01-01'),
        debit: 30000,
        credit: 0,
        branchId: branch._id,
        memberId: memberAmit._id,
        narration: `Principal disbursed for loan ${loanAmit.loanNo}`
      },
      {
        voucherId: jvDisbAmit._id,
        accountHeadId: cashHead._id,
        entryDate: new Date('2026-01-01'),
        debit: 0,
        credit: 30000,
        branchId: branch._id,
        memberId: memberAmit._id,
        narration: `Cash payment for loan disbursement ${loanAmit.loanNo}`
      }
    ]);
    console.log(`Seeded Closed Loan for ${memberAmit.fullName}. Status: CLOSED`);


    // 8.4 Rejected Application - Priya Gupta (index 3)
    const memberPriya = seededMembers[3];
    const productHL = seededProducts['HL01'];
    await LoanApplication.create({
      applicationNo: 'LA-HL-2026-000004',
      memberId: memberPriya._id,
      branchId: branch._id,
      loanProductId: productHL._id,
      requestedAmount: 500000,
      requestedTenureMonths: 60,
      purpose: 'Purchase flat in downtown Jaipur',
      applicationDate: new Date('2026-05-10'),
      applicationStatus: 'rejected',
      remarks: 'Application rejected due to low credit score.',
      rejectionReason: 'Low credit score and insufficient collateral documentation',
      approvedBy: seededStaff[1]._id,
      approvedAt: new Date('2026-05-20')
    });
    console.log(`Seeded Rejected Loan Application for ${memberPriya.fullName}.`);

    // ==========================================
    // 9. SEED DEPOSIT SCHEMES & ACCOUNTS
    // ==========================================
    console.log('Seeding deposit schemes...');
    
    const schemesData = [
      {
        schemeCode: 'RD01',
        schemeName: 'Recurring Deposit Scheme',
        schemeType: 'RD',
        description: 'Standard Recurring Deposit with monthly installments',
        interestType: 'compound',
        interestRate: 8.0,
        compoundingFrequency: 'quarterly',
        minimumTenure: 6,
        maximumTenure: 60,
        tenureUnit: 'months',
        minimumDepositAmount: 500,
        maximumDepositAmount: 50000,
        installmentFrequency: 'monthly',
        allowedPrematureClosure: true,
        prematurePenaltyRate: 1.0,
      },
      {
        schemeCode: 'FD01',
        schemeName: 'Fixed Deposit Scheme',
        schemeType: 'FD',
        description: 'Standard Fixed Deposit with high returns',
        interestType: 'compound',
        interestRate: 9.0,
        compoundingFrequency: 'quarterly',
        minimumTenure: 3,
        maximumTenure: 120,
        tenureUnit: 'months',
        minimumDepositAmount: 1000,
        maximumDepositAmount: 10000000,
        allowedPrematureClosure: true,
        prematurePenaltyRate: 1.0,
      },
      {
        schemeCode: 'DDS01',
        schemeName: 'Daily Deposit Scheme',
        schemeType: 'DDS',
        description: 'Daily collection scheme for small businesses',
        interestType: 'simple',
        interestRate: 6.0,
        minimumTenure: 30,
        maximumTenure: 365,
        tenureUnit: 'days',
        minimumDepositAmount: 50,
        maximumDepositAmount: 5000,
        installmentFrequency: 'daily',
        allowedPrematureClosure: true,
        prematurePenaltyRate: 1.0,
      },
      {
        schemeCode: 'MIS01',
        schemeName: 'Monthly Income Scheme',
        schemeType: 'MIS',
        description: 'Monthly interest payout scheme',
        interestType: 'simple',
        interestRate: 8.5,
        minimumTenure: 12,
        maximumTenure: 120,
        tenureUnit: 'months',
        minimumDepositAmount: 10000,
        maximumDepositAmount: 1500000,
        allowedPrematureClosure: true,
        prematurePenaltyRate: 1.0,
      }
    ];

    const seededSchemes = {};
    for (const s of schemesData) {
      const schemeDoc = await DepositScheme.findOneAndUpdate(
        { schemeCode: s.schemeCode },
        { ...s, isDeleted: false },
        { upsert: true, new: true }
      );
      seededSchemes[s.schemeCode] = schemeDoc;
      console.log(`Seeded scheme: ${schemeDoc.schemeName}`);
    }

    // Load account head models for deposits
    const rdHead = headsMap['21002'];
    const fdHead = headsMap['21003'];
    const ddsHead = headsMap['21004'];
    const misHead = headsMap['21005'];
    const interestExpenseHead = headsMap['51001'];

    if (!rdHead || !fdHead || !ddsHead || !misHead || !interestExpenseHead) {
      console.error('Chart of accounts heads for deposits are missing. Run seed-phase2.mjs first.');
      process.exit(1);
    }

    // 9.1 RD Account - Rajesh Sharma
    console.log('Seeding RD Account...');
    const rdScheme = seededSchemes['RD01'];
    const startDateRD = new Date('2026-01-01');
    const maturityDateRD = new Date(startDateRD);
    maturityDateRD.setMonth(maturityDateRD.getMonth() + 12);
    const nextInstRD = new Date(startDateRD);
    nextInstRD.setMonth(nextInstRD.getMonth() + 6); // next is 6th installment (June)

    const rdAccount = await RDAccount.create({
      rdAccountNo: 'RD-JPR-2026-000001',
      memberId: memberRajesh._id,
      schemeId: rdScheme._id,
      branchId: branch._id,
      monthlyInstallment: 1000,
      tenureMonths: 12,
      interestRate: 8.0,
      startDate: startDateRD,
      maturityDate: maturityDateRD,
      totalDepositAmount: 5000, // 5 paid
      totalInterest: 524.40,
      maturityAmount: 12524.40,
      status: 'active',
      nextInstallmentDate: nextInstRD,
      createdBy: seededStaff[1]._id,
    });

    // Create schedule
    const rdInstallments = [];
    for (let i = 1; i <= 12; i++) {
      const dueDate = new Date(startDateRD);
      dueDate.setMonth(dueDate.getMonth() + i);
      const isPaid = i <= 5;
      
      const inst = await RDInstallment.create({
        rdAccountId: rdAccount._id,
        installmentNo: i,
        dueDate,
        amount: 1000,
        paidAmount: isPaid ? 1000 : 0,
        paidDate: isPaid ? new Date(dueDate.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
        status: isPaid ? 'paid' : 'pending',
      });
      rdInstallments.push(inst);

      if (isPaid) {
        // Post transaction & ledger lines
        txCount++;
        const txn = await Transaction.create({
          transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
          branchId: branch._id,
          memberId: memberRajesh._id,
          accountType: 'scheme',
          accountId: rdAccount.rdAccountNo,
          transactionType: 'RD_DEPOSIT',
          paymentMode: 'CASH',
          amount: 1000,
          balanceAfter: i * 1000,
          narration: `RD installment #${i} payment for ${rdAccount.rdAccountNo}`,
          status: 'POSTED',
          approvedBy: seededStaff[1]._id,
          approvedAt: inst.paidDate,
          createdAt: inst.paidDate,
        });

        jvCount++;
        const jv = await JournalVoucher.create({
          voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
          voucherDate: inst.paidDate,
          voucherType: 'RECEIPT',
          branchId: branch._id,
          narration: txn.narration,
          approvedBy: seededStaff[1]._id,
        });

        await LedgerEntry.create([
          {
            voucherId: jv._id,
            transactionId: txn._id,
            accountHeadId: cashHead._id,
            entryDate: inst.paidDate,
            debit: 1000,
            credit: 0,
            branchId: branch._id,
            memberId: memberRajesh._id,
            narration: txn.narration,
          },
          {
            voucherId: jv._id,
            transactionId: txn._id,
            accountHeadId: rdHead._id,
            entryDate: inst.paidDate,
            debit: 0,
            credit: 1000,
            branchId: branch._id,
            memberId: memberRajesh._id,
            narration: txn.narration,
          }
        ]);
      }
    }
    console.log(`Seeded RD Account: ${rdAccount.rdAccountNo}`);

    // 9.2 FD Account - Suresh Patel
    console.log('Seeding FD Account...');
    const fdScheme = seededSchemes['FD01'];
    const startDateFD = new Date('2026-01-01');
    const maturityDateFD = new Date(startDateFD);
    maturityDateFD.setMonth(maturityDateFD.getMonth() + 12);

    const fdAccount = await FDAccount.create({
      fdAccountNo: 'FD-JPR-2026-000001',
      memberId: memberSuresh._id,
      schemeId: fdScheme._id,
      branchId: branch._id,
      principalAmount: 100000,
      interestRate: 9.0,
      tenureMonths: 12,
      startDate: startDateFD,
      maturityDate: maturityDateFD,
      interestAmount: 9308.33,
      maturityAmount: 109308.33,
      paymentMode: 'maturity',
      status: 'active',
      createdBy: seededStaff[1]._id,
    });

    txCount++;
    const txnFD = await Transaction.create({
      transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
      branchId: branch._id,
      memberId: memberSuresh._id,
      accountType: 'scheme',
      accountId: fdAccount.fdAccountNo,
      transactionType: 'FD_DEPOSIT',
      paymentMode: 'CASH',
      amount: 100000,
      balanceAfter: 100000,
      narration: `FD principal deposit for ${fdAccount.fdAccountNo}`,
      status: 'POSTED',
      approvedBy: seededStaff[1]._id,
      approvedAt: startDateFD,
      createdAt: startDateFD,
    });

    jvCount++;
    const jvFD = await JournalVoucher.create({
      voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
      voucherDate: startDateFD,
      voucherType: 'RECEIPT',
      branchId: branch._id,
      narration: txnFD.narration,
      approvedBy: seededStaff[1]._id,
    });

    await LedgerEntry.create([
      {
        voucherId: jvFD._id,
        transactionId: txnFD._id,
        accountHeadId: cashHead._id,
        entryDate: startDateFD,
        debit: 100000,
        credit: 0,
        branchId: branch._id,
        memberId: memberSuresh._id,
        narration: txnFD.narration,
      },
      {
        voucherId: jvFD._id,
        transactionId: txnFD._id,
        accountHeadId: fdHead._id,
        entryDate: startDateFD,
        debit: 0,
        credit: 100000,
        branchId: branch._id,
        memberId: memberSuresh._id,
        narration: txnFD.narration,
      }
    ]);
    console.log(`Seeded FD Account: ${fdAccount.fdAccountNo}`);

    // 9.3 DDS Account - Amit Verma
    console.log('Seeding DDS Account...');
    const ddsScheme = seededSchemes['DDS01'];
    const startDateDDS = new Date('2026-01-01');
    const maturityDateDDS = new Date(startDateDDS);
    maturityDateDDS.setDate(maturityDateDDS.getDate() + 180);

    const ddsAccount = await DDSAccount.create({
      ddsAccountNo: 'DDS-JPR-2026-000001',
      memberId: memberAmit._id,
      schemeId: ddsScheme._id,
      branchId: branch._id,
      dailyAmount: 100,
      durationDays: 180,
      startDate: startDateDDS,
      maturityDate: maturityDateDDS,
      totalDeposit: 15000, // 150 days paid
      interestAmount: 221.91,
      maturityAmount: 18221.91,
      status: 'active',
      createdBy: seededStaff[1]._id,
    });

    // Let's create a few daily collections logs to show history
    for (let i = 1; i <= 5; i++) {
      const colDate = new Date(startDateDDS);
      colDate.setDate(colDate.getDate() + i);

      await DDSCollection.create({
        ddsAccountId: ddsAccount._id,
        collectionDate: colDate,
        amount: 100,
        collectorId: seededStaff[2]._id,
        status: 'posted',
      });
    }

    // Summary DDS Posting
    txCount++;
    const txnDDS = await Transaction.create({
      transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
      branchId: branch._id,
      memberId: memberAmit._id,
      accountType: 'scheme',
      accountId: ddsAccount.ddsAccountNo,
      transactionType: 'DDS_DEPOSIT',
      paymentMode: 'CASH',
      amount: 15000,
      balanceAfter: 15000,
      narration: `DDS summary collection for ${ddsAccount.ddsAccountNo}`,
      status: 'POSTED',
      approvedBy: seededStaff[1]._id,
      approvedAt: new Date(),
      createdAt: new Date(),
    });

    jvCount++;
    const jvDDS = await JournalVoucher.create({
      voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
      voucherDate: new Date(),
      voucherType: 'RECEIPT',
      branchId: branch._id,
      narration: txnDDS.narration,
      approvedBy: seededStaff[1]._id,
    });

    await LedgerEntry.create([
      {
        voucherId: jvDDS._id,
        transactionId: txnDDS._id,
        accountHeadId: cashHead._id,
        entryDate: new Date(),
        debit: 15000,
        credit: 0,
        branchId: branch._id,
        memberId: memberAmit._id,
        narration: txnDDS.narration,
      },
      {
        voucherId: jvDDS._id,
        transactionId: txnDDS._id,
        accountHeadId: ddsHead._id,
        entryDate: new Date(),
        debit: 0,
        credit: 15000,
        branchId: branch._id,
        memberId: memberAmit._id,
        narration: txnDDS.narration,
      }
    ]);
    console.log(`Seeded DDS Account: ${ddsAccount.ddsAccountNo}`);

    // 9.4 MIS Account - Priya Gupta
    console.log('Seeding MIS Account...');
    const misScheme = seededSchemes['MIS01'];
    const startDateMIS = new Date('2026-01-01');
    const maturityDateMIS = new Date(startDateMIS);
    maturityDateMIS.setMonth(maturityDateMIS.getMonth() + 12);
    const nextPayoutMIS = new Date(startDateMIS);
    nextPayoutMIS.setMonth(nextPayoutMIS.getMonth() + 6); // 5 payouts completed, next is 6th (June)

    const misAccount = await MISAccount.create({
      misAccountNo: 'MIS-JPR-2026-000001',
      memberId: memberPriya._id,
      schemeId: misScheme._id,
      branchId: branch._id,
      principalAmount: 200000,
      interestRate: 8.5,
      monthlyInterestAmount: 1416.67,
      startDate: startDateMIS,
      maturityDate: maturityDateMIS,
      nextPayoutDate: nextPayoutMIS,
      status: 'active',
      createdBy: seededStaff[1]._id,
    });

    // Deposit transaction for MIS
    txCount++;
    const txnMIP = await Transaction.create({
      transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
      branchId: branch._id,
      memberId: memberPriya._id,
      accountType: 'scheme',
      accountId: misAccount.misAccountNo,
      transactionType: 'MIS_DEPOSIT',
      paymentMode: 'CASH',
      amount: 200000,
      balanceAfter: 200000,
      narration: `MIS principal deposit for ${misAccount.misAccountNo}`,
      status: 'POSTED',
      approvedBy: seededStaff[1]._id,
      approvedAt: startDateMIS,
      createdAt: startDateMIS,
    });

    jvCount++;
    const jvMIP = await JournalVoucher.create({
      voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
      voucherDate: startDateMIS,
      voucherType: 'RECEIPT',
      branchId: branch._id,
      narration: txnMIP.narration,
      approvedBy: seededStaff[1]._id,
    });

    await LedgerEntry.create([
      {
        voucherId: jvMIP._id,
        transactionId: txnMIP._id,
        accountHeadId: cashHead._id,
        entryDate: startDateMIS,
        debit: 200000,
        credit: 0,
        branchId: branch._id,
        memberId: memberPriya._id,
        narration: txnMIP.narration,
      },
      {
        voucherId: jvMIP._id,
        transactionId: txnMIP._id,
        accountHeadId: misHead._id,
        entryDate: startDateMIS,
        debit: 0,
        credit: 200000,
        branchId: branch._id,
        memberId: memberPriya._id,
        narration: txnMIP.narration,
      }
    ]);

    // Credit interest payouts to Savings account
    const savingsPriya = seededSavingsAccounts[3]; // Priya Gupta's savings account
    for (let p = 1; p <= 5; p++) {
      const payDate = new Date(startDateMIS);
      payDate.setMonth(payDate.getMonth() + p);

      // Increase Priya's savings balance
      savingsPriya.currentBalance += 1416.67;
      savingsPriya.availableBalance += 1416.67;
      await savingsPriya.save();

      // Payout Transaction
      txCount++;
      const txnPay = await Transaction.create({
        transactionNo: `TXN-JPR-2026-${String(txCount).padStart(6, '0')}`,
        branchId: branch._id,
        memberId: memberPriya._id,
        accountType: 'scheme',
        accountId: savingsPriya.accountNo,
        transactionType: 'MIS_PAYOUT_TRANSFER',
        paymentMode: 'TRANSFER',
        amount: 1416.67,
        balanceAfter: savingsPriya.currentBalance,
        referenceNo: misAccount.misAccountNo,
        narration: `MIS monthly interest payout for ${misAccount.misAccountNo}`,
        status: 'POSTED',
        approvedBy: seededStaff[1]._id,
        approvedAt: payDate,
        createdAt: payDate,
      });

      jvCount++;
      const jvPay = await JournalVoucher.create({
        voucherNo: `JV-JPR-2026-${String(jvCount).padStart(6, '0')}`,
        voucherDate: payDate,
        voucherType: 'JOURNAL',
        branchId: branch._id,
        narration: txnPay.narration,
        approvedBy: seededStaff[1]._id,
      });

      await LedgerEntry.create([
        {
          voucherId: jvPay._id,
          transactionId: txnPay._id,
          accountHeadId: interestExpenseHead._id,
          entryDate: payDate,
          debit: 1416.67,
          credit: 0,
          branchId: branch._id,
          memberId: memberPriya._id,
          narration: txnPay.narration,
        },
        {
          voucherId: jvPay._id,
          transactionId: txnPay._id,
          accountHeadId: savingsHead._id,
          entryDate: payDate,
          debit: 0,
          credit: 1416.67,
          branchId: branch._id,
          memberId: memberPriya._id,
          narration: txnPay.narration,
        }
      ]);
    }
    console.log(`Seeded MIS Account: ${misAccount.misAccountNo} with 5 monthly interest payouts.`);

    console.log('=== DEMO DATA SEEDING COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL: Seeding demo data failed:', err);
    process.exit(1);
  }
}

seedDemoData();
