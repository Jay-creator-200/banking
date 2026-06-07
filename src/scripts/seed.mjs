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
import Permission from '../models/Permission.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI not found in environment.');
  process.exit(1);
}

const defaultRoles = [
  { name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Complete system access, bypasses all permissions.' },
  { name: 'Admin', code: 'ADMIN', description: 'System administrator, manages branches, users, and global configurations.' },
  { name: 'Manager', code: 'MANAGER', description: 'Branch Manager, supervises operations, reviews high-limit transactions and approvals.' },
  { name: 'Cashier', code: 'CASHIER', description: 'Front-office teller operations, executes deposits, withdrawals, and cash books.' },
  { name: 'Loan Officer', code: 'LOAN_OFFICER', description: 'Manages loan accounts, profiles, validations, and collections.' },
  { name: 'Auditor', code: 'AUDITOR', description: 'Read-only access across ledgers, transactions, and user audit trails.' },
  { name: 'Collection Agent', code: 'COLLECTION_AGENT', description: 'Field collection operations, microfinance loan recovery logs.' }
];

const defaultPermissions = [
  // User Management
  { name: 'Create User', code: 'user.create', module: 'users', description: 'Register new employee accounts' },
  { name: 'View User', code: 'user.view', module: 'users', description: 'View user profiles and login logs' },
  { name: 'Update User', code: 'user.update', module: 'users', description: 'Edit user accounts and unlock logins' },
  { name: 'Delete User', code: 'user.delete', module: 'users', description: 'Soft-delete user profiles' },

  // Role Management
  { name: 'Create Role', code: 'role.create', module: 'roles', description: 'Add new user roles' },
  { name: 'View Role', code: 'role.view', module: 'roles', description: 'View system roles list' },
  { name: 'Update Role', code: 'role.update', module: 'roles', description: 'Edit role properties' },
  { name: 'Delete Role', code: 'role.delete', module: 'roles', description: 'Remove custom roles' },
  { name: 'Update Role Mapping', code: 'rolepermission.update', module: 'roles', description: 'Assign permissions to roles' },

  // Branch Management
  { name: 'Create Branch', code: 'branch.create', module: 'branches', description: 'Add new cooperative society branches' },
  { name: 'View Branch', code: 'branch.view', module: 'branches', description: 'List and search branches' },
  { name: 'Update Branch', code: 'branch.update', module: 'branches', description: 'Modify branch details' },
  { name: 'Delete Branch', code: 'branch.delete', module: 'branches', description: 'Soft-delete branch configurations' },

  // Audit Logs
  { name: 'View Audit Logs', code: 'audit.view', module: 'auditing', description: 'Inspect audit trail and log deltas' },
  { name: 'View Login History', code: 'loginlog.view', module: 'auditing', description: 'Inspect employee sign-in history' },

  // Future Modules Placeholders (for RBAC structure compliance)
  { name: 'Create Member', code: 'member.create', module: 'members', description: 'Enroll new members' },
  { name: 'View Member', code: 'member.view', module: 'members', description: 'View member profiles' },
  { name: 'Approve Loan', code: 'loan.approve', module: 'loans', description: 'Authorize loan disbursements' },
  { name: 'Reverse Transaction', code: 'transaction.reverse', module: 'teller', description: 'Rollback wrong cashier postings' },
];

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connection successful. Seeding initial foundation configurations...');

    // 1. Seed Branch (Head Office)
    console.log('Upserting Default Head Office Branch...');
    const defaultBranch = await Branch.findOneAndUpdate(
      { branchCode: 'HO' },
      {
        branchName: 'Head Office',
        address: '121, Noble Cooperative Bank Towers, MG Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        contactNumber: '9876543210',
        email: 'headoffice@noblebank.coop',
        status: 'ACTIVE',
        isDeleted: false
      },
      { upsert: true, new: true }
    );
    console.log(`Branch registered: ${defaultBranch.branchName} [${defaultBranch._id}]`);

    // 2. Seed Roles
    const seededRoles = {};
    console.log('Seeding Default System Roles...');
    for (const r of defaultRoles) {
      const roleDoc = await Role.findOneAndUpdate(
        { code: r.code },
        { ...r, isDeleted: false },
        { upsert: true, new: true }
      );
      seededRoles[r.code] = roleDoc;
    }
    console.log('System roles successfully synchronized.');

    // 3. Seed Permissions
    const seededPermissions = [];
    console.log('Seeding Default System Permissions...');
    for (const p of defaultPermissions) {
      const permDoc = await Permission.findOneAndUpdate(
        { code: p.code },
        { ...p, isDeleted: false },
        { upsert: true, new: true }
      );
      seededPermissions.push(permDoc);
    }
    console.log('System permissions successfully synchronized.');

    // 4. Map All Permissions to SUPER_ADMIN
    console.log('Linking all permissions to SUPER_ADMIN role...');
    // Clear old mappings for SUPER_ADMIN role
    const superAdminRole = seededRoles['SUPER_ADMIN'];
    await RolePermission.deleteMany({ roleId: superAdminRole._id });
    
    const rpMappings = seededPermissions.map(p => ({
      roleId: superAdminRole._id,
      permissionId: p._id
    }));
    await RolePermission.insertMany(rpMappings);
    console.log(`Assigned ${rpMappings.length} permissions to SUPER_ADMIN role.`);

    // 5. Seed Super Admin User
    console.log('Checking for Super Admin user account...');
    const superAdminUser = await User.findOne({ username: 'superadmin' });
    if (!superAdminUser) {
      console.log('Creating Super Admin account...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SecureP@ss1', salt);

      const userDoc = await User.create({
        fullName: 'Noble Super Administrator',
        email: 'admin@noblebank.coop',
        mobile: '9999999999',
        username: 'superadmin',
        employeeCode: 'EMP-0001',
        password: hashedPassword,
        roleId: superAdminRole._id,
        branchId: defaultBranch._id,
        status: 'ACTIVE',
        isDeleted: false
      });
      console.log(`Super Admin user created successfully: ${userDoc.username} [${userDoc._id}]`);
    } else {
      console.log('Super Admin user already exists. Checking associations...');
      superAdminUser.roleId = superAdminRole._id;
      superAdminUser.branchId = defaultBranch._id;
      superAdminUser.isDeleted = false;
      await superAdminUser.save();
      console.log('Super Admin user associations verified.');
    }

    console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed with exception:', error);
    process.exit(1);
  }
}

seed();
