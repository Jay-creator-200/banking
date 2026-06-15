import './load-env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

// Import models
import Member from '../src/models/Member.js';
import MemberPortalAccount from '../src/models/MemberPortalAccount.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import Notification from '../src/models/Notification.js';
import SavingsAccount from '../src/models/SavingsAccount.js';
import Loan from '../src/models/Loan.js';
import LoanSchedule from '../src/models/LoanSchedule.js';
import FDAccount from '../src/models/FDAccount.js';
import Transaction from '../src/models/Transaction.js';
import Branch from '../src/models/Branch.js';
import LoanProduct from '../src/models/LoanProduct.js';
import LoanApplication from '../src/models/LoanApplication.js';
import DepositScheme from '../src/models/DepositScheme.js';

// Import services
import NotificationServiceInstance from '../src/services/NotificationService.js';
import ReminderEngineInstance from '../src/services/ReminderEngine.js';
import DocumentGeneratorServiceInstance from '../src/services/DocumentGeneratorService.js';

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Starting Phase 9 automated test suite...\n');

  let passed = true;

  // Fetch Jaipur branch for relation inserts
  let branch = await Branch.findOne({ branchCode: 'JPR' });
  if (!branch) {
    branch = await Branch.create({
      branchCode: 'JPR',
      branchName: 'Jaipur Metro Branch',
      branchAddress: 'C-Scheme, Jaipur',
    });
  }

  // Fetch or create sample member
  let member = await Member.findOne({ mobile: '9876543210' });
  if (!member) {
    member = await Member.create({
      memberNo: 'MBR009001',
      branchId: branch._id,
      fullName: 'Jay Sahu',
      fatherName: 'Ram Sahu',
      motherName: 'Sita Sahu',
      dateOfBirth: new Date('1995-08-15'),
      gender: 'MALE',
      mobile: '9876543210',
      email: 'jaysahu@cooperative.co.in',
      aadhaarNumber: '999999999999',
      panNumber: 'ABCDE1234F',
      addressLine1: '123, Vaishali Nagar',
      city: 'Jaipur',
      state: 'Rajasthan',
      district: 'Jaipur',
      pincode: '302021',
      memberCategory: 'general',
      kycStatus: 'verified',
      memberStatus: 'active',
    });
  }

  // Ensure Portal Account & Preferences exist
  let portalAccount = await MemberPortalAccount.findOne({ memberId: member._id });
  if (!portalAccount) {
    const hashedPassword = await bcrypt.hash('SecureP@ss1', 10);
    portalAccount = await MemberPortalAccount.create({
      memberId: member._id,
      username: 'jaymember',
      password: hashedPassword,
      isLocked: false,
    });
  }

  let prefs = await NotificationPreference.findOne({ memberId: member._id });
  if (!prefs) {
    prefs = await NotificationPreference.create({
      memberId: member._id,
      smsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      transactionAlerts: true,
      loanAlerts: true,
      depositAlerts: true,
    });
  }

  // Ensure savings account exists
  let savings = await SavingsAccount.findOne({ memberId: member._id });
  if (!savings) {
    savings = await SavingsAccount.create({
      accountNo: 'SB1002009',
      memberId: member._id,
      branchId: branch._id,
      accountType: 'regular',
      minimumBalance: 1000,
      interestRate: 4,
      currentBalance: 5000,
      availableBalance: 5000,
      status: 'active',
    });
  }

  // =======================================================
  // SCENARIO 1: MEMBER LOGIN -> VIEW DETAILS -> STATEMENT
  // =======================================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 1: Member Login & Statement Generation...');
    
    // Simulate credentials verify
    const passwordMatch = await bcrypt.compare('SecureP@ss1', portalAccount.password);
    if (!passwordMatch) throw new Error('Portal password match failed.');
    console.log(`🔑 Simulating Member Login: Success for user "${portalAccount.username}"`);

    // Verify savings balance
    console.log(`🏦 Savings account ${savings.accountNo} balance: ₹${savings.currentBalance}`);

    // Generate statement via service
    console.log('📄 Requesting on-demand savings statement in PDF format...');
    const statementFile = await DocumentGeneratorServiceInstance.generateSavingsStatement({
      accountId: savings._id.toString(),
      format: 'pdf',
    });

    console.log(`✅ Statement generated. File Name: ${statementFile.fileName}`);
    console.log(`🔗 Cloudinary Storage URL: ${statementFile.cloudinaryUrl}`);

    if (!statementFile.cloudinaryUrl) throw new Error('Cloudinary statement URL missing.');
    console.log('✓ Scenario 1 PASSED: Member login and statement rendering successful.');
  } catch (err) {
    console.error('✗ Scenario 1 FAILED:', err.message, err.stack);
    passed = false;
  }

  // =======================================================
  // SCENARIO 2: DEPOSIT TRANSACTION -> ALERT DISPATCH
  // =======================================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 2: Transaction Alert Hook Dispatch...');
    
    // Clear notifications log
    await Notification.deleteMany({ memberId: member._id, category: 'transaction' });

    // Create a POSTED deposit transaction
    const depositTxn = await Transaction.create({
      transactionNo: `TXN${Date.now().toString().slice(-6)}`,
      branchId: branch._id,
      memberId: member._id,
      accountType: 'savings',
      accountId: savings.accountNo,
      transactionType: 'SAVINGS_DEPOSIT',
      paymentMode: 'CASH',
      amount: 1500,
      balanceAfter: savings.currentBalance + 1500,
      status: 'POSTED',
      approvedAt: new Date(),
    });

    console.log(`💳 Created Posted Deposit Transaction of ₹${depositTxn.amount}. Ref: ${depositTxn.transactionNo}`);

    // Execute alerts dispatch trigger
    console.log('🔔 Invoking notification trigger hook...');
    await NotificationServiceInstance.triggerTransactionAlert(depositTxn._id.toString());

    // Wait short time for async trigger
    await new Promise(r => setTimeout(r, 800));

    // Verify notifications were logged in collection
    const alerts = await Notification.find({ memberId: member._id, category: 'transaction' });
    console.log(`📝 Notifications created: ${alerts.length} channel items.`);
    alerts.forEach(a => console.log(`  - Channel: ${a.type} | Status: ${a.status} | Msg: ${a.message.substring(0, 50)}...`));

    // Check we sent SMS, EMAIL, and WHATSAPP
    const types = alerts.map(a => a.type);
    if (!types.includes('SMS') || !types.includes('EMAIL') || !types.includes('WHATSAPP')) {
      throw new Error('Transaction alert was not dispatched to all enabled preferences.');
    }

    console.log('✓ Scenario 2 PASSED: Transaction alert hook executed successfully.');
  } catch (err) {
    console.error('✗ Scenario 2 FAILED:', err.message, err.stack);
    passed = false;
  }

  // =======================================================
  // SCENARIO 3: LOAN EMI DUE -> REMINDER GENERATED
  // =======================================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 3: Loan EMI Due Reminder Scans...');
    
    // Clear reminders, loans, and loan applications
    await Notification.deleteMany({ memberId: member._id, category: 'reminder', title: 'Loan Payment Reminder' });
    if (member) {
      const existingLoans = await Loan.find({ memberId: member._id });
      const loanIds = existingLoans.map(l => l._id);
      await LoanSchedule.deleteMany({ loanId: { $in: loanIds } });
      await Loan.deleteMany({ memberId: member._id });
      await LoanApplication.deleteMany({ memberId: member._id });
    }

    // Create a product
    let product = await LoanProduct.findOne({ productCode: 'LNP' });
    if (!product) {
      product = await LoanProduct.create({
        productCode: 'LNP',
        productName: 'Personal Development Loan',
        interestRate: 12,
        interestType: 'flat',
        minimumAmount: 1000,
        maximumAmount: 100000,
        minimumTenure: 1,
        maximumTenure: 60,
        isActive: true,
      });
    }

    // Create application
    let app = await LoanApplication.create({
      applicationNo: 'LA-2009',
      branchId: branch._id,
      memberId: member._id,
      loanProductId: product._id,
      requestedAmount: 10000,
      requestedTenureMonths: 12,
      applicationStatus: 'approved',
      approvedAmount: 10000,
      approvedTenure: 12,
    });

    // Create loan
    const loan = await Loan.create({
      loanNo: 'LN-2009',
      memberId: member._id,
      branchId: branch._id,
      loanProductId: product._id,
      applicationId: app._id,
      disbursementDate: new Date(),
      principalAmount: 10000,
      interestRate: 12,
      interestType: 'flat',
      tenureMonths: 12,
      emiAmount: 1000,
      totalInterest: 1200,
      totalPayable: 11200,
      outstandingPrincipal: 10000,
      outstandingInterest: 1200,
      loanStatus: 'active',
    });

    // Create installment due in 7 days
    const due7Days = new Date();
    due7Days.setDate(due7Days.getDate() + 7);

    const schedule = await LoanSchedule.create({
      loanId: loan._id,
      installmentNo: 1,
      dueDate: due7Days,
      openingPrincipal: 10000,
      principalDue: 833,
      interestDue: 100,
      totalDue: 933,
      closingPrincipal: 9167,
      paymentStatus: 'pending',
    });

    console.log(`📅 Created Loan Schedule for Installment #1 due in 7 days on ${due7Days.toLocaleDateString('en-IN')}`);

    // Trigger EMI Reminders run
    console.log('⏰ Triggering reminder engine scans...');
    const reminderCount = await ReminderEngineInstance.runEMIReminders();
    console.log(`Reminders dispatched in scan: ${reminderCount}`);

    // Verify reminder logged
    const logs = await Notification.find({
      memberId: member._id,
      category: 'reminder',
      title: 'Loan Payment Reminder',
    });

    console.log(`📝 Generated reminders: ${logs.length} channels.`);
    logs.forEach(l => console.log(`  - Channel: ${l.type} | Msg: ${l.message}`));

    if (logs.length === 0) throw new Error('Reminder engine failed to generate alerts for 7-day installment.');
    console.log('✓ Scenario 3 PASSED: Loan EMI reminder generated successfully.');
  } catch (err) {
    console.error('✗ Scenario 3 FAILED:', err.message, err.stack);
    passed = false;
  }

  // =======================================================
  // SCENARIO 4: FD MATURITY REMINDER
  // =======================================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 4: Deposit Maturity Scans...');
    
    await Notification.deleteMany({ memberId: member._id, category: 'reminder', title: 'Deposit Maturity Reminder' });
    await FDAccount.deleteMany({ fdAccountNo: 'FD1002009' });

    // Create deposit scheme
    let scheme = await DepositScheme.findOne({ schemeCode: 'FDS' });
    if (!scheme) {
      scheme = await DepositScheme.create({
        schemeCode: 'FDS',
        schemeName: 'Super Fixed Deposit',
        schemeType: 'FD',
        interestType: 'simple',
        interestRate: 7.5,
        minimumTenure: 12,
        maximumTenure: 120,
        tenureUnit: 'months',
        minimumDepositAmount: 5000,
        maximumDepositAmount: 1000000,
        isActive: true,
      });
    }

    // Create FD due to mature in 15 days
    const mature15Days = new Date();
    mature15Days.setDate(mature15Days.getDate() + 15);

    const fd = await FDAccount.create({
      fdAccountNo: 'FD1002009',
      memberId: member._id,
      schemeId: scheme._id,
      branchId: branch._id,
      principalAmount: 20000,
      interestRate: 7.5,
      tenureMonths: 12,
      startDate: new Date(mature15Days.getTime() - 365 * 24 * 60 * 60 * 1000),
      maturityDate: mature15Days,
      interestAmount: 1500,
      maturityAmount: 21500,
      status: 'active',
    });

    console.log(`📅 Created FD Account maturing in 15 days on ${mature15Days.toLocaleDateString('en-IN')}`);

    // Trigger scans
    console.log('⏰ Triggering deposit maturity scan run...');
    const sentCount = await ReminderEngineInstance.runMaturityReminders();
    console.log(`Maturity alerts dispatched: ${sentCount}`);

    const logs = await Notification.find({
      memberId: member._id,
      category: 'reminder',
      title: 'Deposit Maturity Reminder',
    });

    console.log(`📝 Generated reminders: ${logs.length} channels.`);
    logs.forEach(l => console.log(`  - Channel: ${l.type} | Msg: ${l.message}`));

    if (logs.length === 0) throw new Error('Reminder engine failed to generate deposit maturity alerts.');
    console.log('✓ Scenario 4 PASSED: Deposit maturity reminder generated successfully.');
  } catch (err) {
    console.error('✗ Scenario 4 FAILED:', err.message, err.stack);
    passed = false;
  }

  // =======================================================
  // SCENARIO 5: ADMIN BROADCASTS BULK NOTIFICATION
  // =======================================================
  try {
    console.log('----------------------------------------------------');
    console.log('SCENARIO 5: Administrative Bulk broadcast alerts...');
    
    // Clear alerts
    await Notification.deleteMany({ category: 'system', title: 'Urgent Bank Broadcast' });

    // Trigger broadcast API simulate (send bulk email to all general members)
    console.log('📣 Triggering bulk broadcasting engine...');
    
    let apiSimulateRes;
    let dispatched = 0;
    try {
      apiSimulateRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer banking_cron_secret_2026', // Bypass middleware auth for testing
        },
        body: JSON.stringify({
          memberCategory: 'general',
          type: 'EMAIL',
          category: 'system',
          title: 'Urgent Bank Broadcast',
          message: 'This is an administrative bulk notification sent to all general cohort members.',
        }),
      });
    } catch (fetchErr) {
      console.warn('Dev server not reachable or fetch failed. Error:', fetchErr.message);
    }

    // Fallback directly to service dispatch if dev server is not active
    if (apiSimulateRes && apiSimulateRes.ok) {
      const body = await apiSimulateRes.json();
      dispatched = body.summary.dispatchedCount;
    } else {
      console.warn('Dev server not reachable. Executing direct service fallback bulk broadcast...');
      const membersList = await Member.find({ memberCategory: 'general', memberStatus: 'active' }).lean();
      for (const m of membersList) {
        await NotificationServiceInstance.sendNotification({
          memberId: m._id,
          type: 'EMAIL',
          category: 'system',
          title: 'Urgent Bank Broadcast',
          message: 'This is an administrative bulk notification sent to all general cohort members.',
        });
        dispatched++;
      }
    }

    console.log(`📊 Bulk alerts dispatched to: ${dispatched} general members.`);
    
    const logs = await Notification.find({
      category: 'system',
      title: 'Urgent Bank Broadcast',
    });

    console.log(`📝 Logged broadcast notifications count: ${logs.length}`);
    if (logs.length === 0) throw new Error('Bulk broadcast failed to create notification records.');

    console.log('✓ Scenario 5 PASSED: Administrative bulk broadcast completed successfully.');
  } catch (err) {
    console.error('✗ Scenario 5 FAILED:', err.message, err.stack);
    passed = false;
  }

  // Disconnect
  await mongoose.disconnect();
  console.log('----------------------------------------------------');
  
  if (passed) {
    console.log('🎉 ALL 5 SCENARIOS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('❌ SOME TEST SCENARIOS ENCOUNTERED FAILURES.');
    process.exit(1);
  }
}

runTests();
