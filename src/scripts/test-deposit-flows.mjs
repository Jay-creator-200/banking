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

import Member from '../models/Member.js';
import SavingsAccount from '../models/SavingsAccount.js';
import DepositScheme from '../models/DepositScheme.js';
import RDAccount from '../models/RDAccount.js';
import RDInstallment from '../models/RDInstallment.js';
import FDAccount from '../models/FDAccount.js';
import DDSAccount from '../models/DDSAccount.js';
import DDSCollection from '../models/DDSCollection.js';
import MISAccount from '../models/MISAccount.js';
import Transaction from '../models/Transaction.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';

import rdService from '../services/RDService.js';
import fdService from '../services/FDService.js';
import ddsService from '../services/DDSService.js';
import misService from '../services/MISService.js';
import depositMaturityService from '../services/DepositMaturityService.js';
import depositClosureService from '../services/DepositClosureService.js';
import transactionService from '../services/TransactionService.js';
import approvalService from '../services/ApprovalService.js';

async function runTests() {
  try {
    console.log('Connecting to database for E2E tests...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully. Cleaning up prior test items...');
    await Member.deleteMany({ email: 'test.deposit@noblebank.coop' });

    // Resolve branch and users
    const branch = await Branch.findOne({ branchCode: 'NCS-JP-001' });
    const manager = await User.findOne({ username: 'jaipur_manager' });
    const cashier = await User.findOne({ username: 'cashier_raj' });

    if (!branch || !manager || !cashier) {
      console.error('Jaipur branch, manager, or cashier missing. Seed demo data first.');
      process.exit(1);
    }

    const branchId = branch._id.toString();
    const managerId = manager._id.toString();
    const cashierId = cashier._id.toString();

    // Create a new member for clean isolated test
    console.log('1. Creating test member...');
    const member = await Member.create({
      memberNo: `MBR-TST-${Date.now()}`,
      branchId,
      fullName: 'Test Deposit Member',
      mobile: `99${String(Date.now()).slice(-8)}`,
      email: 'test.deposit@noblebank.coop',
      kycStatus: 'verified',
      memberStatus: 'active',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      addressLine1: '123 Test Street',
      city: 'Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302015',
      aadhaarNumber: '112233445566',
      fatherName: 'Test Father',
      motherName: 'Test Mother',
    });
    const memberId = member._id.toString();

    // Create savings account for funding and payout
    console.log('2. Creating savings account for member...');
    const savingsAccountNo = `SAV-TST-${Date.now()}`;
    const savingsAccount = await SavingsAccount.create({
      accountNo: savingsAccountNo,
      memberId,
      branchId,
      openingDate: new Date(),
      accountType: 'regular',
      minimumBalance: 1000,
      interestRate: 4.0,
      currentBalance: 500000, // Seed with plenty of funds
      availableBalance: 500000,
      status: 'active',
    });
    console.log(`Savings account created: ${savingsAccount.accountNo} with balance ₹${savingsAccount.currentBalance}`);

    // Create Scheme Masters
    console.log('3. Resolving Scheme Masters...');
    const rdScheme = await DepositScheme.findOne({ schemeCode: 'RD01' });
    const fdScheme = await DepositScheme.findOne({ schemeCode: 'FD01' });
    const ddsScheme = await DepositScheme.findOne({ schemeCode: 'DDS01' });
    const misScheme = await DepositScheme.findOne({ schemeCode: 'MIS01' });

    if (!rdScheme || !fdScheme || !ddsScheme || !misScheme) {
      console.error('Deposit scheme masters missing. Seed demo data first.');
      process.exit(1);
    }

    // =========================================================
    // TEST WORKFLOW 1: RD ACCOUNT OPENING & COLLECTION & MATURITY
    // =========================================================
    console.log('\n--- TEST WORKFLOW 1: RD ACCOUNT LIFE CYCLE ---');
    console.log('Booking RD account...');
    const rdAccount = await rdService.openAccount({
      memberId,
      schemeId: rdScheme._id.toString(),
      branchId,
      monthlyInstallment: 2000,
      tenureMonths: 12,
      startDate: new Date('2026-01-01').toISOString(),
    }, cashierId);

    console.log(`RD Account booked: ${rdAccount.rdAccountNo}`);
    const rdAccountDetail = await RDAccount.findById(rdAccount._id);
    console.log(`Initial Balances: Principal ₹${rdAccountDetail.totalDepositAmount}, Maturity Amount ₹${rdAccountDetail.maturityAmount}`);

    console.log('Collecting RD installment #1 via Cash...');
    const rdTxn = await rdService.collectInstallment({
      rdAccountId: rdAccount._id.toString(),
      installmentNo: 1,
      amount: 2000,
      paymentMode: 'CASH',
    }, cashierId);

    console.log(`RD Installment transaction request created: ${rdTxn.transactionNo} (${rdTxn.status})`);
    
    // Approve transaction
    console.log('Approving RD collection transaction...');
    const rdApproval = await ApprovalRequest.findOne({ referenceId: rdTxn._id, status: 'PENDING' });
    await approvalService.approve(rdApproval._id, managerId, { remarks: 'Approve RD deposit' });

    const updatedRD = await RDAccount.findById(rdAccount._id);
    console.log(`RD Account after approval: Principal ₹${updatedRD.totalDepositAmount}, Next installment due date: ${updatedRD.nextInstallmentDate}`);
    if (updatedRD.totalDepositAmount !== 2000) {
      throw new Error(`RD Deposit balance mismatch: expected 2000, got ${updatedRD.totalDepositAmount}`);
    }

    // =========================================================
    // TEST WORKFLOW 2: FD ACCOUNT BOOKING WITH TRANSFER & PREMATURE CLOSURE
    // =========================================================
    console.log('\n--- TEST WORKFLOW 2: FD ACCOUNT LIFE CYCLE ---');
    console.log('Booking FD account funded via TRANSFER from Savings...');
    
    // We book FD account and trigger transfer transaction
    const fdAccount = await fdService.openAccount({
      memberId,
      schemeId: fdScheme._id.toString(),
      branchId,
      principalAmount: 100000,
      tenureMonths: 12,
      paymentMode: 'maturity',
      startDate: new Date().toISOString(),
      fundingSource: 'TRANSFER',
      fundingSavingsAccountNo: savingsAccount.accountNo,
    }, cashierId);

    console.log(`FD Account booked: ${fdAccount.fdAccountNo}. Fetching pending transfer transaction...`);
    const fdTxn = await Transaction.findOne({ accountId: fdAccount.fdAccountNo, status: 'PENDING' });
    console.log(`FD initial deposit txn: ${fdTxn.transactionNo}. Check hold on savings account...`);
    
    // Verify hold on Savings Account availableBalance
    const savingsPreApproval = await SavingsAccount.findOne({ accountNo: savingsAccount.accountNo });
    console.log(`Savings currentBalance: ₹${savingsPreApproval.currentBalance}, availableBalance: ₹${savingsPreApproval.availableBalance}`);
    if (savingsPreApproval.availableBalance !== 400000) {
      throw new Error(`Hold failed! Savings availableBalance expected 400000, got ${savingsPreApproval.availableBalance}`);
    }

    // Approve the FD deposit transaction
    console.log('Approving FD deposit transfer transaction...');
    const fdApproval = await ApprovalRequest.findOne({ referenceId: fdTxn._id, status: 'PENDING' });
    await approvalService.approve(fdApproval._id, managerId, { remarks: 'Approve FD deposit transfer' });

    // Verify balances after approval
    const savingsPostApproval = await SavingsAccount.findOne({ accountNo: savingsAccount.accountNo });
    console.log(`Savings after FD booking: currentBalance ₹${savingsPostApproval.currentBalance}, availableBalance ₹${savingsPostApproval.availableBalance}`);
    if (savingsPostApproval.currentBalance !== 400000 || savingsPostApproval.availableBalance !== 400000) {
      throw new Error(`Savings balance debit failed! Expected current balance 400000, got ${savingsPostApproval.currentBalance}`);
    }

    // Recalculate premature closure estimates
    console.log('Calculating premature closure details for FD account (simulation)...');
    const closureDetails = await depositClosureService.calculatePrematureClosure(fdAccount._id.toString(), 'FD');
    console.log(`Recalculated Interest: ₹${closureDetails.recalculatedInterest}, Payout Amount: ₹${closureDetails.payoutAmount}`);
    console.log(`Penalty Rate: ${closureDetails.penaltyRate}%, Effective Rate: ${closureDetails.effectiveInterestRate}%`);

    // Request premature closure transfer to savings
    console.log('Submitting premature closure request...');
    const closureTxn = await depositClosureService.requestPrematureClosure({
      accountId: fdAccount._id.toString(),
      accountType: 'FD',
      remarks: 'Customer emergency need',
      paymentMode: 'TRANSFER',
      fundingSavingsAccountNo: savingsAccount.accountNo, // destination
      branchId,
    }, cashierId);

    console.log(`Premature closure txn: ${closureTxn.transactionNo} (${closureTxn.status}). Approving...`);
    const closureApproval = await ApprovalRequest.findOne({ referenceId: closureTxn._id, status: 'PENDING' });
    await approvalService.approve(closureApproval._id, managerId, { remarks: 'Approve premature closure' });

    // Verify account and savings balances
    const closedFD = await FDAccount.findById(fdAccount._id);
    const savingsAfterClosure = await SavingsAccount.findOne({ accountNo: savingsAccount.accountNo });
    console.log(`FD Account status: ${closedFD.status}`);
    console.log(`Savings balance after closure credit: currentBalance ₹${savingsAfterClosure.currentBalance}, availableBalance ₹${savingsAfterClosure.availableBalance}`);
    if (closedFD.status !== 'closed') {
      throw new Error(`FD Account status should be closed, got: ${closedFD.status}`);
    }

    // =========================================================
    // TEST WORKFLOW 3: DDS ACCOUNT & DAILY COLLECTIONS
    // =========================================================
    console.log('\n--- TEST WORKFLOW 3: DDS ACCOUNT LIFE CYCLE ---');
    console.log('Booking DDS account...');
    const ddsAccount = await ddsService.openAccount({
      memberId,
      schemeId: ddsScheme._id.toString(),
      branchId,
      dailyAmount: 200,
      durationDays: 100,
    }, cashierId);

    console.log(`DDS Account booked: ${ddsAccount.ddsAccountNo}`);

    console.log('Posting a daily collection deposit...');
    const ddsTxn = await ddsService.collectAmount({
      ddsAccountId: ddsAccount._id.toString(),
      amount: 200,
      paymentMode: 'CASH',
    }, cashierId);

    console.log(`DDS deposit txn: ${ddsTxn.transactionNo}. Approving...`);
    const ddsApproval = await ApprovalRequest.findOne({ referenceId: ddsTxn._id, status: 'PENDING' });
    await approvalService.approve(ddsApproval._id, managerId, { remarks: 'Approve DDS deposit' });

    const updatedDDS = await DDSAccount.findById(ddsAccount._id);
    const collectionsCount = await DDSCollection.countDocuments({ ddsAccountId: ddsAccount._id });
    console.log(`DDS Account totalDeposit: ₹${updatedDDS.totalDeposit}, Collections entries: ${collectionsCount}`);
    if (updatedDDS.totalDeposit !== 200 || collectionsCount !== 1) {
      throw new Error('DDS Collection posting failed to increment balance or log collection record');
    }

    // =========================================================
    // TEST WORKFLOW 4: MIS ACCOUNT & MONTHLY PAYOUTS
    // =========================================================
    console.log('\n--- TEST WORKFLOW 4: MIS ACCOUNT LIFE CYCLE ---');
    console.log('Booking MIS account...');
    const misAccount = await misService.openAccount({
      memberId,
      schemeId: misScheme._id.toString(),
      branchId,
      principalAmount: 300000,
      tenureMonths: 12,
    }, cashierId);

    console.log(`MIS Account booked: ${misAccount.misAccountNo}`);

    // Approve the initial deposit
    const misDepositTxn = await Transaction.findOne({ accountId: misAccount.misAccountNo, status: 'PENDING' });
    const misApproval = await ApprovalRequest.findOne({ referenceId: misDepositTxn._id, status: 'PENDING' });
    await approvalService.approve(misApproval._id, managerId, { remarks: 'Approve MIS initial deposit' });

    console.log(`MIS Account principal: ₹${(await MISAccount.findById(misAccount._id)).principalAmount}`);

    // Simulate due payout
    console.log('Triggering interest payout for MIS account...');
    const payoutTxn = await misService.processPayout(misAccount, cashierId);
    console.log(`MIS Payout transaction: ${payoutTxn.transactionNo} (${payoutTxn.status}). Approving...`);

    const payoutApproval = await ApprovalRequest.findOne({ referenceId: payoutTxn._id, status: 'PENDING' });
    await approvalService.approve(payoutApproval._id, managerId, { remarks: 'Approve MIS monthly payout' });

    const updatedMIS = await MISAccount.findById(misAccount._id);
    console.log(`MIS Account nextPayoutDate advanced to: ${updatedMIS.nextPayoutDate}`);

    console.log('\n=========================================');
    console.log('=== ALL E2E DEPOSIT TESTS PASSED ===');
    console.log('=========================================');
    
    // Delete test items to leave db clean
    await Member.deleteOne({ _id: memberId });
    await SavingsAccount.deleteOne({ accountNo: savingsAccountNo });
    await RDAccount.deleteOne({ _id: rdAccount._id });
    await RDInstallment.deleteMany({ rdAccountId: rdAccount._id });
    await FDAccount.deleteOne({ _id: fdAccount._id });
    await DDSAccount.deleteOne({ _id: ddsAccount._id });
    await DDSCollection.deleteMany({ ddsAccountId: ddsAccount._id });
    await MISAccount.deleteOne({ _id: misAccount._id });

    process.exit(0);
  } catch (err) {
    console.error('E2E TEST FAILURE:', err);
    process.exit(1);
  }
}

runTests();
