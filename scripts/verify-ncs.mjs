import './load-env.js';
import mongoose from 'mongoose';
import Branch from '../src/models/Branch.js';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';
import Member from '../src/models/Member.js';
import Transaction from '../src/models/Transaction.js';
import ApprovalRequest from '../src/models/ApprovalRequest.js';
import LedgerEntry from '../src/models/LedgerEntry.js';
import SavingsAccount from '../src/models/SavingsAccount.js';
import { MemberServiceInstance } from '../src/services/MemberService.js';
import { TransactionServiceInstance } from '../src/services/TransactionService.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function verify() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Running customization checks...\n');

  try {
    // Print all transactions in DB before doing anything
    const allTxnsBefore = await Transaction.find({});
    console.log("--- ALL TRANSACTIONS IN DATABASE BEFORE TEST ---");
    allTxnsBefore.forEach(t => {
      console.log(`  - No: ${t.transactionNo} | MemberId: ${t.memberId} | Narration: ${t.narration} | ID: ${t._id}`);
    });
    console.log("-----------------------------------------------\n");

    // --- Pre-cleanup of any previous runs ---
    const m1s = await Member.find({ $or: [{ mobile: '9999999991' }, { memberNo: 'NCS-0003' }, { fullName: 'Test Auto Member' }] });
    for (const m1 of m1s) {
      const txns = await Transaction.find({ memberId: m1._id });
      const txnIds = txns.map(t => t._id);
      await LedgerEntry.deleteMany({ transactionId: { $in: txnIds } });
      await Transaction.deleteMany({ memberId: m1._id });
      await SavingsAccount.deleteMany({ memberId: m1._id });
      await Member.deleteOne({ _id: m1._id });
      console.log(`🧹 Cleaned up old Test Case 1 member (${m1.memberNo}), accounts, and transactions.`);
    }
    const m2 = await Member.findOne({ mobile: '9999999992' });
    if (m2) {
      const txns = await Transaction.find({ memberId: m2._id });
      const txnIds = txns.map(t => t._id);
      await LedgerEntry.deleteMany({ transactionId: { $in: txnIds } });
      await Transaction.deleteMany({ memberId: m2._id });
      await SavingsAccount.deleteMany({ memberId: m2._id });
      await Member.deleteOne({ _id: m2._id });
      console.log('🧹 Cleaned up old Test Case 2 member, accounts, and transactions.');
    }
    
    // Clean up general test transactions and ledger entries
    const testTxns = await Transaction.find({ narration: /test/i });
    const testTxnIds = testTxns.map(t => t._id);
    if (testTxnIds.length > 0) {
      await LedgerEntry.deleteMany({ transactionId: { $in: testTxnIds } });
      await Transaction.deleteMany({ _id: { $in: testTxnIds } });
      console.log(`🧹 Cleaned up ${testTxnIds.length} stray test transactions.`);
    }

    // 1. Get Udaipur branch
    const branch = await Branch.findOne({ branchCode: 'UDP001' });
    if (!branch) throw new Error('Udaipur Branch UDP001 not found.');
    console.log('✅ Found Udaipur Branch:', branch.branchName);

    // 2. Get Super Admin user
    const superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) throw new Error('Super Admin user not found.');
    console.log('✅ Found Super Admin user:', superAdmin.fullName);

    // 3. Test Case 1: Member Auto-Increment (NCS-0003)
    console.log('\n--- Test Case 1: Auto-incrementing Member ---');
    const autoMember = await MemberServiceInstance.createMember({
      branchId: branch._id.toString(),
      fullName: 'Test Auto Member',
      fatherName: 'Father Sahu',
      motherName: 'Mother Sahu',
      dateOfBirth: new Date('1998-01-01'),
      gender: 'MALE',
      mobile: '9999999991',
      aadhaarNumber: '999999999991',
      addressLine1: 'Test Address',
      city: 'Udaipur',
      state: 'Rajasthan',
      district: 'Udaipur',
      pincode: '313001',
      memberCategory: 'general',
      memberNoType: 'auto',
    }, superAdmin._id.toString());
    
    console.log('✅ Member created with auto code:', autoMember.memberNo);
    if (autoMember.memberNo !== 'NCS-0003') {
      throw new Error(`Expected NCS-0003 but got ${autoMember.memberNo}`);
    }

    // 4. Test Case 2: Member Manual Suffix (345 -> NCS-0345)
    console.log('\n--- Test Case 2: Manual Suffix Member ---');
    const manualMember = await MemberServiceInstance.createMember({
      branchId: branch._id.toString(),
      fullName: 'Test Manual Member',
      fatherName: 'Father Sahu',
      motherName: 'Mother Sahu',
      dateOfBirth: new Date('1998-01-01'),
      gender: 'MALE',
      mobile: '9999999992',
      aadhaarNumber: '999999999992',
      addressLine1: 'Test Address',
      city: 'Udaipur',
      state: 'Rajasthan',
      district: 'Udaipur',
      pincode: '313001',
      memberCategory: 'general',
      memberNoType: 'manual',
      manualMemberNo: '345'
    }, superAdmin._id.toString());
    
    console.log('✅ Member created with manual code:', manualMember.memberNo);
    if (manualMember.memberNo !== 'NCS-0345') {
      throw new Error(`Expected NCS-0345 but got ${manualMember.memberNo}`);
    }

    // 5. Test Case 3: Duplicate Manual Suffix Validation
    console.log('\n--- Test Case 3: Duplicate Manual Suffix ---');
    try {
      await MemberServiceInstance.createMember({
        branchId: branch._id.toString(),
        fullName: 'Test Duplicate Member',
        fatherName: 'Father Sahu',
        motherName: 'Mother Sahu',
        dateOfBirth: new Date('1998-01-01'),
        gender: 'MALE',
        mobile: '9999999993',
        aadhaarNumber: '999999999993',
        addressLine1: 'Test Address',
        city: 'Udaipur',
        state: 'Rajasthan',
        district: 'Udaipur',
        pincode: '313001',
        memberCategory: 'general',
        memberNoType: 'manual',
        manualMemberNo: '345'
      }, superAdmin._id.toString());
      throw new Error('Should have failed due to duplicate member code.');
    } catch (e) {
      console.log('✅ Duplicate blocked successfully:', e.message);
    }

    // 6. Test Case 4: Super Admin direct posting transaction
    console.log('\n--- Test Case 4: Super Admin direct transaction posting ---');
    
    // Retrieve correct Savings Account number for autoMember
    const autoMemberSavings = await SavingsAccount.findOne({ memberId: autoMember._id });
    if (!autoMemberSavings) {
      throw new Error('Failed to find savings account automatically created for autoMember.');
    }
    console.log(`✅ Found Savings Account for Auto Member: ${autoMemberSavings.accountNo}`);

    const countBeforeApprovals = await ApprovalRequest.countDocuments({ status: 'PENDING' });
    
    // Create a transaction as Super Admin
    const txn = await TransactionServiceInstance.createTransaction({
      branchId: branch._id.toString(),
      memberId: autoMember._id.toString(),
      accountType: 'savings',
      accountId: autoMemberSavings.accountNo,
      transactionType: 'SAVINGS_DEPOSIT',
      paymentMode: 'CASH',
      amount: 500,
      narration: 'Super Admin direct posting test',
    }, superAdmin._id.toString());

    console.log(`✅ Transaction created: ${txn.transactionNo}, status: ${txn.status}`);
    if (txn.status !== 'POSTED') {
      throw new Error(`Expected status POSTED but got ${txn.status}`);
    }

    const countAfterApprovals = await ApprovalRequest.countDocuments({ status: 'PENDING' });
    if (countBeforeApprovals !== countAfterApprovals) {
      throw new Error('An approval request was created in the queue when it should have been bypassed!');
    }
    console.log('✅ Verification: No approval request was queued.');

    // Verify ledger entry is posted
    const ledgerEntries = await LedgerEntry.find({ transactionId: txn._id });
    console.log(`✅ Ledger entries generated: ${ledgerEntries.length}`);
    if (ledgerEntries.length === 0) {
      throw new Error('No ledger entries were posted for this transaction!');
    }

    // 7. Clean up test records
    console.log('\n--- Cleaning up test records ---');
    await Member.deleteOne({ _id: autoMember._id });
    await Member.deleteOne({ _id: manualMember._id });
    await SavingsAccount.deleteOne({ memberId: autoMember._id });
    await SavingsAccount.deleteOne({ memberId: manualMember._id });
    await Transaction.deleteOne({ _id: txn._id });
    await LedgerEntry.deleteMany({ transactionId: txn._id });
    console.log('✅ Clean up complete.');

    console.log('\n🎉 ALL NCS CUSTOMIZATION VERIFICATION CHECKS PASSED!');
  } catch (err) {
    console.error('\n❌ Verification failed:', err.message, err.stack);
    if (err.details) {
      console.error('Error Details:', JSON.stringify(err.details, null, 2));
    }
  } finally {
    await mongoose.disconnect();
  }
}

verify();
