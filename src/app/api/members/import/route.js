import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberService from '@/services/MemberService.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

const aliases = {
  fullName: ['fullName', 'full_name', 'name', 'memberName', 'member_name'],
  fatherName: ['fatherName', 'father_name', 'father', 'guardianName'],
  motherName: ['motherName', 'mother_name', 'mother'],
  spouseName: ['spouseName', 'spouse_name', 'spouse'],
  dateOfBirth: ['dateOfBirth', 'dob', 'date_of_birth'],
  gender: ['gender'],
  mobile: ['mobile', 'mobileNo', 'phone', 'contactNumber'],
  alternateMobile: ['alternateMobile', 'alternate_mobile', 'alternatePhone'],
  email: ['email'],
  occupation: ['occupation'],
  annualIncome: ['annualIncome', 'annual_income'],
  aadhaarNumber: ['aadhaarNumber', 'aadhaar', 'aadhar', 'aadhaar_no'],
  panNumber: ['panNumber', 'pan', 'pan_no'],
  addressLine1: ['addressLine1', 'address', 'address1'],
  addressLine2: ['addressLine2', 'address2'],
  city: ['city'],
  state: ['state'],
  district: ['district'],
  pincode: ['pincode', 'pin', 'postalCode'],
  memberCategory: ['memberCategory', 'category', 'casteCategory'],
  membershipDate: ['membershipDate', 'joiningDate', 'memberSince'],
  manualMemberNo: ['manualMemberNo', 'memberNo', 'member_no', 'oldMemberNo'],
  otherBankName: ['otherBankName', 'bankName'],
  otherBankBranch: ['otherBankBranch', 'bankBranch'],
  otherBankAccountNumber: ['otherBankAccountNumber', 'bankAccountNo'],
  otherBankIfscCode: ['otherBankIfscCode', 'ifsc'],
  upiId: ['upiId', 'upi'],
  remarks: ['remarks', 'notes'],
};

function pick(row, field) {
  const keys = aliases[field] || [field];
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
  }
  return undefined;
}

function cleanNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function cleanDigits(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?e\+\d+$/i.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) {
      return Math.trunc(num).toLocaleString('fullwide', { useGrouping: false });
    }
  }
  const digits = raw.replace(/\D/g, '');
  return digits || undefined;
}

function normalizeDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value).trim();
  const indianDate = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (indianDate) {
    const [, day, month, year] = indianDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const excelSerial = Number(raw);
  if (/^\d+(\.\d+)?$/.test(raw) && excelSerial > 20000 && excelSerial < 60000) {
    const date = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }

  return raw;
}

function cleanManualMemberNo(value) {
  if (!value) return undefined;
  const cleaned = String(value).trim().toUpperCase().replace(/^NCS-/, '');
  return cleaned || undefined;
}

function cleanPincode(value) {
  if (!value) return undefined;
  const digits = cleanDigits(value);
  return digits ? digits.padStart(6, '0') : undefined;
}

function getErrorDetails(error) {
  return error.errors || error.details || error.cause?.errors || error.cause?.details || null;
}

function normalizeRow(row, defaultBranchId) {
  const manualMemberNo = cleanManualMemberNo(pick(row, 'manualMemberNo'));
  const data = {
    branchId: row.branchId || defaultBranchId,
    fullName: pick(row, 'fullName'),
    fatherName: pick(row, 'fatherName'),
    motherName: pick(row, 'motherName'),
    spouseName: pick(row, 'spouseName'),
    dateOfBirth: normalizeDate(pick(row, 'dateOfBirth')),
    gender: String(pick(row, 'gender') || '').toUpperCase(),
    mobile: String(pick(row, 'mobile') || '').trim(),
    alternateMobile: pick(row, 'alternateMobile'),
    email: pick(row, 'email'),
    occupation: pick(row, 'occupation'),
    annualIncome: cleanNumber(pick(row, 'annualIncome')),
    aadhaarNumber: cleanDigits(pick(row, 'aadhaarNumber')),
    panNumber: pick(row, 'panNumber'),
    addressLine1: pick(row, 'addressLine1'),
    addressLine2: pick(row, 'addressLine2'),
    city: pick(row, 'city'),
    state: pick(row, 'state'),
    district: pick(row, 'district'),
    pincode: cleanPincode(pick(row, 'pincode')),
    memberCategory: String(pick(row, 'memberCategory') || 'general').toLowerCase(),
    membershipDate: normalizeDate(pick(row, 'membershipDate')),
    manualMemberNo,
    otherBankName: pick(row, 'otherBankName'),
    otherBankBranch: pick(row, 'otherBankBranch'),
    otherBankAccountNumber: pick(row, 'otherBankAccountNumber'),
    otherBankIfscCode: pick(row, 'otherBankIfscCode'),
    upiId: pick(row, 'upiId'),
    remarks: pick(row, 'remarks'),
    autoChargeFee: row.autoChargeFee === true || String(row.autoChargeFee || '').toLowerCase() === 'true',
  };

  if (data.manualMemberNo) data.memberNoType = 'manual';
  Object.keys(data).forEach((key) => {
    if (data[key] === undefined || data[key] === '') delete data[key];
  });
  return data;
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to import members');
    }

    const body = await req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) throw AppError.validation('No member rows supplied for import');
    if (!body.branchId) throw AppError.validation('Default branch is required for member import');

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'Unknown';
    const results = [];

    for (let index = 0; index < rows.length; index += 1) {
      try {
        const data = normalizeRow(rows[index], body.branchId);
        const member = await memberService.createMember(data, session.user.id, { ip, ua });
        results.push({ row: index + 1, success: true, memberId: member._id, memberNo: member.memberNo, fullName: member.fullName });
      } catch (error) {
        results.push({
          row: index + 1,
          success: false,
          message: error.message || 'Import failed for this row',
          details: getErrorDetails(error),
        });
      }
    }

    const created = results.filter((r) => r.success).length;
    return successResponse({ created, failed: results.length - created, results }, created > 0 ? 201 : 422);
  } catch (error) {
    return errorResponse(error);
  }
}
