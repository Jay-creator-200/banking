import './load-env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

// Import models
import Branch from '../src/models/Branch.js';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';
import Member from '../src/models/Member.js';
import MemberPortalAccount from '../src/models/MemberPortalAccount.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import Notification from '../src/models/Notification.js';
import SavingsAccount from '../src/models/SavingsAccount.js';
import RDAccount from '../src/models/RDAccount.js';
import RDInstallment from '../src/models/RDInstallment.js';
import FDAccount from '../src/models/FDAccount.js';
import DDSAccount from '../src/models/DDSAccount.js';
import DDSCollection from '../src/models/DDSCollection.js';
import MISAccount from '../src/models/MISAccount.js';
import LoanProduct from '../src/models/LoanProduct.js';
import LoanApplication from '../src/models/LoanApplication.js';
import Loan from '../src/models/Loan.js';
import LoanSchedule from '../src/models/LoanSchedule.js';
import LoanPayment from '../src/models/LoanPayment.js';
import JournalVoucher from '../src/models/JournalVoucher.js';
import LedgerEntry from '../src/models/LedgerEntry.js';
import ApprovalRequest from '../src/models/ApprovalRequest.js';
import AuditLog from '../src/models/AuditLog.js';
import LoginLog from '../src/models/LoginLog.js';
import MemberDocument from '../src/models/MemberDocument.js';
import MemberNominee from '../src/models/MemberNominee.js';
import ShareCertificate from '../src/models/ShareCertificate.js';
import ShareLedger from '../src/models/ShareLedger.js';
import Sequence from '../src/models/Sequence.js';
import DepositScheme from '../src/models/DepositScheme.js';
import Transaction from '../src/models/Transaction.js';
import TransactionReversal from '../src/models/TransactionReversal.js';
import Expense from '../src/models/Expense.js';
import LoanWriteoff from '../src/models/LoanWriteoff.js';
import CashSession from '../src/models/CashSession.js';
import CashTransactionRegister from '../src/models/CashTransactionRegister.js';
import CashTransfer from '../src/models/CashTransfer.js';
import VaultTransaction from '../src/models/VaultTransaction.js';
import BankReconciliation from '../src/models/BankReconciliation.js';
import Budget from '../src/models/Budget.js';
import BusinessDayClosing from '../src/models/BusinessDayClosing.js';
import CashDenomination from '../src/models/CashDenomination.js';
import DigitalStatement from '../src/models/DigitalStatement.js';
import IncomeEntry from '../src/models/IncomeEntry.js';
import LoanCollateral from '../src/models/LoanCollateral.js';
import LoanGuarantor from '../src/models/LoanGuarantor.js';
import SavingsInterestHistory from '../src/models/SavingsInterestHistory.js';


async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to database.');

  try {
    console.log('Wiping old demo data...');
    // Delete all operational documents across all collections
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Member.deleteMany({});
    await MemberPortalAccount.deleteMany({});
    await NotificationPreference.deleteMany({});
    await Notification.deleteMany({});
    await SavingsAccount.deleteMany({});
    await RDAccount.deleteMany({});
    await RDInstallment.deleteMany({});
    await FDAccount.deleteMany({});
    await DDSAccount.deleteMany({});
    await DDSCollection.deleteMany({});
    await MISAccount.deleteMany({});
    await LoanProduct.deleteMany({});
    await LoanApplication.deleteMany({});
    await Loan.deleteMany({});
    await LoanSchedule.deleteMany({});
    await LoanPayment.deleteMany({});
    await JournalVoucher.deleteMany({});
    await LedgerEntry.deleteMany({});
    await ApprovalRequest.deleteMany({});
    await AuditLog.deleteMany({});
    await LoginLog.deleteMany({});
    await MemberDocument.deleteMany({});
    await MemberNominee.deleteMany({});
    await ShareCertificate.deleteMany({});
    await ShareLedger.deleteMany({});
    await Sequence.deleteMany({});
    await DepositScheme.deleteMany({});
    await Transaction.deleteMany({});
    await TransactionReversal.deleteMany({});
    await Expense.deleteMany({});
    await LoanWriteoff.deleteMany({});
    await CashSession.deleteMany({});
    await CashTransactionRegister.deleteMany({});
    await CashTransfer.deleteMany({});
    await VaultTransaction.deleteMany({});
    await BankReconciliation.deleteMany({});
    await Budget.deleteMany({});
    await BusinessDayClosing.deleteMany({});
    await CashDenomination.deleteMany({});
    await DigitalStatement.deleteMany({});
    await IncomeEntry.deleteMany({});
    await LoanCollateral.deleteMany({});
    await LoanGuarantor.deleteMany({});
    await SavingsInterestHistory.deleteMany({});


    console.log('Wipe complete. Creating Udaipur Branch...');

    // 1. Create Udaipur Branch
    const branch = await Branch.create({
      branchCode: 'UDP001',
      branchName: 'Udaipur Branch',
      address: '12, Saheli Marg, Near Saheliyon-ki-Bari',
      city: 'Udaipur',
      state: 'Rajasthan',
      pincode: '313001',
      contactNumber: '0294-2412345',
      email: 'udaipur@ncs.coop',
      currentBusinessDate: new Date('2026-06-15'),
      status: 'ACTIVE',
    });
    console.log(`✅ Branch created: ${branch.branchName} (${branch.branchCode})`);

    // 2. Load and verify roles
    const roles = await Role.find({});
    const rolesMap = {};
    for (const r of roles) {
      rolesMap[r.code] = r;
    }

    const requiredRoles = ['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'LOAN_OFFICER', 'ACCOUNTANT', 'AUDITOR'];
    for (const roleCode of requiredRoles) {
      if (!rolesMap[roleCode]) {
        console.log(`Role ${roleCode} not found, creating it...`);
        const roleName = roleCode.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        const rDoc = await Role.create({
          code: roleCode,
          name: roleName,
          description: `Default system role for ${roleName}`,
        });
        rolesMap[roleCode] = rDoc;
      }
    }

    // 3. Create Staff Users for Udaipur Branch
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecureP@ss1', salt);

    const staffData = [
      {
        fullName: 'NCS Super Admin',
        email: 'superadmin@ncs.coop',
        mobile: '9999900001',
        username: 'superadmin',
        employeeCode: 'EMP-UDP-001',
        password: passwordHash,
        roleId: rolesMap['SUPER_ADMIN']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'NCS Manager',
        email: 'manager@ncs.coop',
        mobile: '9999900002',
        username: 'manager',
        employeeCode: 'EMP-UDP-002',
        password: passwordHash,
        roleId: rolesMap['MANAGER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'NCS Cashier',
        email: 'cashier@ncs.coop',
        mobile: '9999900003',
        username: 'cashier',
        employeeCode: 'EMP-UDP-003',
        password: passwordHash,
        roleId: rolesMap['CASHIER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'NCS Loan Officer',
        email: 'loanofficer@ncs.coop',
        mobile: '9999900004',
        username: 'loanofficer',
        employeeCode: 'EMP-UDP-004',
        password: passwordHash,
        roleId: rolesMap['LOAN_OFFICER']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'NCS Accountant',
        email: 'accountant@ncs.coop',
        mobile: '9999900005',
        username: 'accountant',
        employeeCode: 'EMP-UDP-005',
        password: passwordHash,
        roleId: rolesMap['ACCOUNTANT']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      },
      {
        fullName: 'NCS Auditor',
        email: 'auditor@ncs.coop',
        mobile: '9999900006',
        username: 'auditor',
        employeeCode: 'EMP-UDP-006',
        password: passwordHash,
        roleId: rolesMap['AUDITOR']._id,
        branchId: branch._id,
        status: 'ACTIVE',
        isDeleted: false
      }
    ];

    for (const u of staffData) {
      await User.create(u);
      console.log(`✅ Seeded staff user: ${u.username} (${u.fullName})`);
    }

    // 4. Create Initial Members (Hemendra Sahu & Jagdish Sahu)
    const membersData = [
      {
        memberNo: 'NCS-0001',
        branchId: branch._id,
        membershipDate: new Date('2026-06-15'),
        fullName: 'Hemendra Sahu',
        fatherName: 'Ramprasad Sahu',
        motherName: 'Saraswati Sahu',
        dateOfBirth: new Date('1990-05-10'),
        gender: 'MALE',
        mobile: '9876543210',
        email: 'hemendra.sahu@example.com',
        occupation: 'Business',
        annualIncome: 500000,
        aadhaarNumber: '111111111111',
        panNumber: 'ABCDE1111F',
        addressLine1: '10, Hiran Magri, Sector 4',
        city: 'Udaipur',
        state: 'Rajasthan',
        district: 'Udaipur',
        pincode: '313002',
        memberCategory: 'general',
        kycStatus: 'verified',
        memberStatus: 'active'
      },
      {
        memberNo: 'NCS-0002',
        branchId: branch._id,
        membershipDate: new Date('2026-06-15'),
        fullName: 'Jagdish Sahu',
        fatherName: 'Laxminarayan Sahu',
        motherName: 'Lilavati Sahu',
        dateOfBirth: new Date('1988-11-20'),
        gender: 'MALE',
        mobile: '9876543211',
        email: 'jagdish.sahu@example.com',
        occupation: 'Farmer',
        annualIncome: 350000,
        aadhaarNumber: '222222222222',
        panNumber: 'ABCDE2222G',
        addressLine1: '15, Panchwati',
        city: 'Udaipur',
        state: 'Rajasthan',
        district: 'Udaipur',
        pincode: '313001',
        memberCategory: 'general',
        kycStatus: 'verified',
        memberStatus: 'active'
      }
    ];

    const seededMembers = [];
    for (const m of membersData) {
      const mem = await Member.create(m);
      seededMembers.push(mem);
      console.log(`✅ Seeded member: ${mem.fullName} (${mem.memberNo})`);

      // Create Member Portal Account
      const portalUser = mem.fullName.split(' ')[0].toLowerCase();
      const pHash = await bcrypt.hash('SecureP@ss1', 10);
      await MemberPortalAccount.create({
        memberId: mem._id,
        username: portalUser,
        password: pHash,
        isLocked: false,
        failedLoginAttempts: 0,
      });
      console.log(`   - Portal login: username "${portalUser}", password "SecureP@ss1"`);

      // Create default NotificationPreference
      await NotificationPreference.create({
        memberId: mem._id,
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        transactionAlerts: true,
        loanAlerts: true,
        depositAlerts: true,
        marketingAlerts: false,
      });

      // Auto-open savings account
      const savAccNo = `SAV-UDP-${mem.memberNo.split('-')[1]}`;
      await SavingsAccount.create({
        accountNo: savAccNo,
        memberId: mem._id,
        branchId: branch._id,
        openingDate: new Date('2026-06-15'),
        accountType: 'regular',
        minimumBalance: 1000,
        interestRate: 4.0,
        currentBalance: 0,
        availableBalance: 0,
        status: 'active',
      });
      console.log(`   - Opened Savings Account: ${savAccNo}`);
    }

    // 5. Seed default Loan Products
    const loanProducts = [
      {
        productCode: 'PL01',
        productName: 'Personal Loan',
        description: 'General purpose personal loan for members',
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
        description: 'Instant loan against gold ornaments',
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
      }
    ];
    for (const p of loanProducts) {
      await LoanProduct.create(p);
      console.log(`✅ Seeded loan product: ${p.productName}`);
    }

    // 6. Seed default Deposit Schemes
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

    for (const s of schemesData) {
      await DepositScheme.create(s);
      console.log(`✅ Seeded deposit scheme: ${s.schemeName}`);
    }

    // 7. Seed MBR sequence value in DB to match current memberCount
    await Sequence.create({
      prefix: 'MBR',
      branchId: branch._id,
      year: new Date().getFullYear(),
      currentValue: 2,
    });
    console.log(`✅ Sequence generator for MBR set to 2.`);

    console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message, err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

seed();
