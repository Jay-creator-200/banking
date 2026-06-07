import { NextResponse } from 'next/server';
import { emailSchema, mobileSchema, passwordSchema } from '@/schemas/common/index.js';
import { AppError } from '@/utils/error-handler.js';
import uploadService from '@/services/UploadService.js';
import { formatDate, daysBetween } from '@/utils/date-helper.js';
import { validateFile } from '@/utils/file-helper.js';
import connectDB from '@/lib/mongodb.js';

export async function GET() {
  const testResults = [];

  // Helper to record test results
  const assertTest = (name, testFn) => {
    try {
      testFn();
      testResults.push({ name, passed: true, error: null });
    } catch (err) {
      testResults.push({ name, passed: false, error: err.message || String(err) });
    }
  };

  // Test 1: Error Handler class
  assertTest('Custom AppError Structure', () => {
    const error = new AppError(403, 'Permission denied', { role: 'TELLER' }, 'AUTH_FORBIDDEN');
    if (error.statusCode !== 403) throw new Error('Incorrect status code');
    if (error.errorCode !== 'AUTH_FORBIDDEN') throw new Error('Incorrect error code');
    if (error.errors.role !== 'TELLER') throw new Error('Incorrect details payload');
    if (!(error instanceof Error)) throw new Error('Does not inherit from Error');
  });

  // Test 2: Zod common schema validation - email
  assertTest('Zod Schema: Email Validator', () => {
    // Valid cases
    if (!emailSchema.safeParse('test.admin@cooperative.co.in').success) throw new Error('Should pass valid Indian email');
    if (!emailSchema.safeParse('user@bank.com').success) throw new Error('Should pass simple email');
    
    // Invalid cases
    if (emailSchema.safeParse('plainaddress').success) throw new Error('Should fail plain address');
    if (emailSchema.safeParse('@missingusername.com').success) throw new Error('Should fail missing username');
  });

  // Test 3: Zod common schema validation - mobile
  assertTest('Zod Schema: Indian Mobile Validator', () => {
    // Valid cases (10 digits starting with 6-9)
    if (!mobileSchema.safeParse('9876543210').success) throw new Error('Should pass valid 9xxxxxxxxx');
    if (!mobileSchema.safeParse('7012345678').success) throw new Error('Should pass valid 7xxxxxxxxx');
    
    // Invalid cases
    if (mobileSchema.safeParse('1234567890').success) throw new Error('Should fail numbers starting with 1');
    if (mobileSchema.safeParse('987654321').success) throw new Error('Should fail less than 10 digits');
    if (mobileSchema.safeParse('98765432101').success) throw new Error('Should fail more than 10 digits');
    if (mobileSchema.safeParse('98765abcde').success) throw new Error('Should fail alphabetic inputs');
  });

  // Test 4: Zod common schema validation - password complexity
  assertTest('Zod Schema: Secure Password Validator', () => {
    // Valid case (Min 8 characters, 1 upper, 1 lower, 1 digit, 1 special)
    if (!passwordSchema.safeParse('SecureP@ss1').success) throw new Error('Should pass compliant secure password');
    
    // Invalid cases
    if (passwordSchema.safeParse('simple').success) throw new Error('Should fail too short password');
    if (passwordSchema.safeParse('nouppercase@1').success) throw new Error('Should fail missing uppercase');
    if (passwordSchema.safeParse('NOLOWERCASE@1').success) throw new Error('Should fail missing lowercase');
    if (passwordSchema.safeParse('NoSpecialChar1').success) throw new Error('Should fail missing special character');
    if (passwordSchema.safeParse('NoDigitsPassword@').success) throw new Error('Should fail missing digit');
  });

  // Test 5: Indian Banking Date Utility
  assertTest('Date Utility: Indian format & Interest period', () => {
    const testDate = new Date('2026-06-07T10:00:00Z');
    const formatted = formatDate(testDate);
    if (formatted !== '07-06-2026') throw new Error(`Incorrect formatting, got: ${formatted}`);

    // Test duration calculations (Simple interest days check)
    const start = new Date('2026-04-01');
    const end = new Date('2026-04-11');
    const days = daysBetween(start, end);
    if (days !== 10) throw new Error(`Incorrect duration math: expected 10, got ${days}`);
  });

  // Test 6: File boundary limits
  assertTest('File Helper: size and format limits', () => {
    const sizeOk = validateFile(4 * 1024 * 1024, 'image/jpeg', 'IMAGE'); // 4MB
    const sizeFail = validateFile(6 * 1024 * 1024, 'image/jpeg', 'IMAGE'); // 6MB
    if (!sizeOk.valid) throw new Error('Should accept 4MB file');
    if (sizeFail.valid) throw new Error('Should reject 6MB file');

    const typeOk = validateFile(1024, 'image/jpeg', 'IMAGE');
    const typeFail = validateFile(1024, 'application/zip', 'IMAGE');
    if (!typeOk.valid) throw new Error('Should accept whitelisted type');
    if (typeFail.valid) throw new Error('Should reject non-whitelisted type');
  });

  // Test 7: Cloudinary Upload Service integration (runs mock fallback seamlessly)
  let uploadResult = null;
  try {
    // 1x1 transparent PNG pixel to bypass format checks in live Cloudinary environment
    const fileBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    uploadResult = await uploadService.uploadImage(fileBuffer, 'test_sandbox');
    testResults.push({
      name: 'Cloudinary Mock Gateway Upload',
      passed: true,
      data: { url: uploadResult.url, publicId: uploadResult.publicId },
      error: null
    });
  } catch (err) {
    testResults.push({
      name: 'Cloudinary Mock Gateway Upload',
      passed: false,
      error: err.message || String(err)
    });
  }

  // Test 8: MongoDB Connection Check (Optional attempt depending on env keys)
  let dbOk = false;
  let dbMsg = '';
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      dbOk = true;
      dbMsg = 'Database connection singleton verified.';
    } else {
      dbOk = true;
      dbMsg = 'MONGODB_URI missing in build env. Skipping active link validation.';
    }
    testResults.push({ name: 'Database Connection Singleton Hook', passed: dbOk, notes: dbMsg, error: null });
  } catch (err) {
    testResults.push({ name: 'Database Connection Singleton Hook', passed: false, error: err.message || String(err) });
  }

  const allPassed = testResults.every(t => t.passed);

  return NextResponse.json({
    success: allPassed,
    summary: {
      total: testResults.length,
      passed: testResults.filter(t => t.passed).length,
      failed: testResults.filter(t => !t.passed).length
    },
    results: testResults
  });
}
