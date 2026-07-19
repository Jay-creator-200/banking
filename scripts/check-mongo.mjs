import fs from 'fs';
import path from 'path';

// Minimal .env loader (no extra dependency)
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
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
} catch (e) {
  // ignore missing .env
}

const { default: dbConnect } = await import('../src/lib/mongodb.js');

(async () => {
  try {
    await dbConnect();
    console.log('OK: MongoDB connection established');
    process.exit(0);
  } catch (err) {
    console.error('ERROR: MongoDB connection failed');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }
})();
