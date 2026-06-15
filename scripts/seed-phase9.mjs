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
import Branch from '../src/models/Branch.js';
import MemberPortalAccount from '../src/models/MemberPortalAccount.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import Notification from '../src/models/Notification.js';

async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to database.');

  try {
    // 1. Get or create a branch
    let branch = await Branch.findOne({ branchCode: 'JPR' });
    if (!branch) {
      branch = await Branch.create({
        branchCode: 'JPR',
        branchName: 'Jaipur Metro Branch',
        branchAddress: 'C-Scheme, Jaipur',
      });
    }

    // 2. Get or create a sample member
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

    console.log(`Seeding portal account for member: ${member.fullName} (${member.memberNo})`);

    // 3. Create Member Portal Account
    const hashedPassword = await bcrypt.hash('SecureP@ss1', 10);
    await MemberPortalAccount.deleteMany({ memberId: member._id });
    const portalAccount = await MemberPortalAccount.create({
      memberId: member._id,
      username: 'jaymember',
      password: hashedPassword,
      isLocked: false,
      failedLoginAttempts: 0,
    });
    console.log(`✅ Member portal login username created: "${portalAccount.username}"`);

    // 4. Create Notification Preferences
    await NotificationPreference.deleteMany({ memberId: member._id });
    await NotificationPreference.create({
      memberId: member._id,
      smsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      transactionAlerts: true,
      loanAlerts: true,
      depositAlerts: true,
      marketingAlerts: false,
    });
    console.log('✅ Notification preferences initialized for Jay Sahu.');

    // 5. Create Sample Sent, Pending, and Failed notifications
    await Notification.deleteMany({ memberId: member._id });
    
    // Sent Notification
    await Notification.create({
      notificationNo: 'NTF-100001',
      memberId: member._id,
      type: 'SMS',
      category: 'transaction',
      title: 'Savings Account Credited',
      message: 'Deposit alert: Your account SB-1002 has been credited with INR 5,000.00 on 10-06-2026.',
      status: 'sent',
      sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    // Failed Notification
    await Notification.create({
      notificationNo: 'NTF-100002',
      memberId: member._id,
      type: 'EMAIL',
      category: 'reminder',
      title: 'EMI Repayment Overdue Warning',
      message: 'URGENT: Your loan EMI for account LN-2001 is OVERDUE. Outstanding: INR 8,400.00. Please clear immediately.',
      status: 'failed',
      sentAt: null,
    });

    // Pending Notification
    await Notification.create({
      notificationNo: 'NTF-100003',
      memberId: member._id,
      type: 'WHATSAPP',
      category: 'deposit',
      title: 'FD Account approaching maturity',
      message: 'Alert: Your FD account FD-3001 matures in 7 days. Est proceeds: INR 54,000.00.',
      status: 'pending',
      sentAt: null,
    });

    console.log('✅ Sample notifications seeded successfully.');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message, err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

seed();
