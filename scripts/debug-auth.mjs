/**
 * Debug script: checks what users exist in MongoDB and verifies bcrypt password match.
 * Run with: node scripts/debug-auth.mjs
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Manual .env parsing (no dotenv dependency needed)
const envPath = join(__dirname, '../.env');
const envLines = readFileSync(envPath, 'utf-8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  process.env[key] = val;
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

console.log('🔌 Connecting to MongoDB...');
await mongoose.connect(uri);
console.log('✅ Connected\n');

// Fetch all users (raw, no schema needed)
const db = mongoose.connection.db;
const users = await db.collection('users').find({}).toArray();

console.log(`📋 Total users in DB: ${users.length}`);
if (users.length === 0) {
  console.log('⚠️  No users found — database is empty. Need to run seed.');
} else {
  for (const u of users) {
    console.log('\n--- User ---');
    console.log('  _id       :', u._id.toString());
    console.log('  username  :', u.username);
    console.log('  email     :', u.email);
    console.log('  status    :', u.status);
    console.log('  isLocked  :', u.isLocked);
    console.log('  roleId    :', u.roleId?.toString());
    console.log('  branchId  :', u.branchId?.toString());
    console.log('  password  :', u.password ? u.password.substring(0, 20) + '...' : 'MISSING');

    // Test password match
    const testPasswords = ['SecureP@ss1', 'Admin@123', 'password', 'admin123'];
    for (const pw of testPasswords) {
      const match = await bcrypt.compare(pw, u.password || '');
      if (match) console.log(`  ✅ Password match: "${pw}"`);
    }
  }
}

// Also check roles and branches
const roles = await db.collection('roles').find({}).toArray();
console.log(`\n📋 Total roles in DB: ${roles.length}`);
roles.forEach(r => console.log('  role:', r.code, '/', r.name, '- id:', r._id.toString()));

const branches = await db.collection('branches').find({}).toArray();
console.log(`\n📋 Total branches in DB: ${branches.length}`);
branches.forEach(b => console.log('  branch:', b.branchCode, '/', b.branchName));

await mongoose.disconnect();
console.log('\n🔌 Disconnected');
