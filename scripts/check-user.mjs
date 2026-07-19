import fs from 'fs';
import path from 'path';

// Minimal .env loader
try {
  const envPath = path.resolve(process.cwd(), '.env');
  const envRaw = fs.readFileSync(envPath, 'utf8');
  envRaw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
} catch (e) {}

const { default: dbConnect } = await import('../src/lib/mongodb.js');
await dbConnect();

const { default: User } = await import('../src/models/User.js');
import bcrypt from 'bcryptjs';

const identifier = (process.env.SUPER_ADMIN_USERNAME || 'superadmin').toLowerCase();
const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] }).lean();
if (!user) {
  console.log('No user found with identifier:', identifier);
  process.exit(1);
}

console.log('Found user:', { email: user.email, username: user.username, isLocked: user.isLocked, status: user.status });

const plain = process.env.SUPER_ADMIN_PASSWORD || '';
const match = await bcrypt.compare(plain, user.password);
console.log('Password matches SUPER_ADMIN_PASSWORD from .env:', match);
process.exit(0);
