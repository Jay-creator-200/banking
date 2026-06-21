import './load-env.js';
import mongoose from 'mongoose';
import Branch from '../src/models/Branch.js';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';
import Member from '../src/models/Member.js';
import MemberPortalAccount from '../src/models/MemberPortalAccount.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function list() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  try {
    console.log('=== BRANCHES ===');
    const branches = await Branch.find({});
    branches.forEach(b => {
      console.log(`- ${b.branchName} (${b.branchCode}) | ID: ${b._id}`);
    });

    console.log('\n=== ROLES ===');
    const roles = await Role.find({});
    roles.forEach(r => {
      console.log(`- ${r.name} (${r.code}) | ID: ${r._id}`);
    });

    console.log('\n=== STAFF USERS ===');
    const users = await User.find({}).populate('roleId').populate('branchId');
    users.forEach(u => {
      console.log(`- ${u.fullName} (${u.username}) | Email: ${u.email} | Role: ${u.roleId?.code} | Branch: ${u.branchId?.branchName}`);
    });

    console.log('\n=== MEMBER PORTAL ACCOUNTS ===');
    const memberAccounts = await MemberPortalAccount.find({}).populate('memberId');
    memberAccounts.forEach(ma => {
      console.log(`- Member: ${ma.memberId?.fullName} | Username: ${ma.username} | Email: ${ma.memberId?.email}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

list();
