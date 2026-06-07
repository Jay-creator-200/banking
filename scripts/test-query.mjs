/**
 * Direct Mongoose query test using the full schema stack (middleware included).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');
const envLines = readFileSync(envPath, 'utf-8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load all models (simulate what app does)
const { default: connectDB } = await import('../src/lib/mongodb.js');
const { default: User } = await import('../src/models/User.js');
const { default: Role } = await import('../src/models/Role.js');
const { default: Branch } = await import('../src/models/Branch.js');

await connectDB();
console.log('✅ Connected via connectDB()\n');

// Test the exact same query that findForAuth uses
const identifier = 'admin@apexbank.in';
const queryStr = String(identifier || '').toLowerCase().trim();
console.log('Querying with:', queryStr);

const user = await User.findOne({
  $or: [{ email: queryStr }, { username: queryStr }],
}).populate('roleId').exec();

if (user) {
  console.log('✅ User found:', user.email, '/', user.username);
  console.log('   status:', user.status);
  console.log('   isLocked:', user.isLocked);
  console.log('   roleId:', user.roleId);
  
  const match = await bcrypt.compare('SecureP@ss1', user.password);
  console.log('   password match:', match);
} else {
  console.log('❌ User NOT found with Mongoose query (schema middleware active)');
  
  // Try without middleware
  const rawUser = await User.findOne({
    $or: [{ email: queryStr }, { username: queryStr }],
    isDeleted: true // force look at deleted too
  }).exec();
  console.log('   With isDeleted:true search:', rawUser ? `found email=${rawUser.email}` : 'still not found');
}

await mongoose.disconnect();
console.log('\n🔌 Disconnected');
