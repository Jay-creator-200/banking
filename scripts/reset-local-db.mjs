import fs from 'fs';
import path from 'path';
import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const idx = trimmed.indexOf('=');
    if (idx === -1) return;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing from .env');

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (_) {}

  const opts = {
    bufferCommands: false,
    maxPoolSize: 5,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(uri, opts);
  } catch (error) {
    const isSrvDnsFailure =
      error?.code === 'ECONNREFUSED' &&
      typeof error?.hostname === 'string' &&
      error.hostname.startsWith('_mongodb._tcp.');

    if (!isSrvDnsFailure || !process.env.MONGODB_DIRECT_URI) throw error;
    console.warn('MongoDB SRV DNS lookup failed locally. Retrying with MONGODB_DIRECT_URI.');
    await mongoose.connect(process.env.MONGODB_DIRECT_URI, opts);
  }
}

loadEnv();

const [{ default: Branch }, { default: Role }, { default: User }] = await Promise.all([
  import('../src/models/Branch.js'),
  import('../src/models/Role.js'),
  import('../src/models/User.js'),
]);

const username = (process.env.SUPER_ADMIN_USERNAME || '').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD || '';
const email = (process.env.SUPER_ADMIN_EMAIL || `${username || 'superadmin'}@noblebank.coop`)
  .trim()
  .toLowerCase();

if (!username) throw new Error('SUPER_ADMIN_USERNAME is missing from .env');
if (!password) throw new Error('SUPER_ADMIN_PASSWORD is missing from .env');

try {
  console.log('Connecting to MongoDB...');
  await connect();

  const dbName = mongoose.connection.db.databaseName;
  console.log(`Dropping database: ${dbName}`);
  await mongoose.connection.db.dropDatabase();

  console.log('Creating Udaipur branch...');
  const branch = await Branch.create({
    branchCode: 'NCS-UD-001',
    branchName: 'Udaipur Branch',
    address: 'Nada Khada',
    city: 'Udaipur',
    district: 'Udaipur',
    state: 'Rajasthan',
    pincode: '313001',
    currentBusinessDate: new Date(),
    status: 'ACTIVE',
    isDeleted: false,
  });

  console.log('Creating SUPER_ADMIN role...');
  const role = await Role.create({
    name: 'Super Admin',
    code: 'SUPER_ADMIN',
    description: 'Complete system access.',
    status: 'ACTIVE',
    isDeleted: false,
  });

  console.log('Creating single superadmin user from .env credentials...');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    fullName: 'Super Administrator',
    email,
    mobile: '9999999999',
    username,
    employeeCode: 'EMP-0001',
    password: passwordHash,
    roleId: role._id,
    branchId: branch._id,
    designation: 'Super Administrator',
    department: 'Administration',
    joiningDate: new Date(),
    employmentType: 'permanent',
    monthlySalary: 0,
    isLocked: false,
    failedLoginAttempts: 0,
    status: 'ACTIVE',
    isDeleted: false,
  });

  await Promise.all([Branch.syncIndexes(), Role.syncIndexes(), User.syncIndexes()]);

  console.log('Reset complete.');
  console.log({
    branch: { branchCode: branch.branchCode, branchName: branch.branchName, address: branch.address },
    user: { username: user.username, email: user.email, role: role.code },
  });
} finally {
  await mongoose.disconnect();
}
