import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import ReceiptSetting from '@/models/ReceiptSetting.js';
import Transaction from '@/models/Transaction.js';
import JournalVoucher from '@/models/JournalVoucher.js';
import LedgerEntry from '@/models/LedgerEntry.js';
import Expense from '@/models/Expense.js';
import SalaryPayment from '@/models/SalaryPayment.js';

async function getSettings() {
  return ReceiptSetting.findOne({ isDeleted: { $ne: true } }).lean();
}

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.view')) {
      throw AppError.forbidden('You do not have permission to print receipts');
    }

    const { type, id } = await params;
    const receiptType = String(type || '').toLowerCase();
    let record = null;
    let entries = [];

    if (receiptType === 'transaction') {
      record = await Transaction.findById(id)
        .populate('branchId', 'branchName branchCode address city state contactNumber')
        .populate('memberId', 'fullName memberNo mobile')
        .populate('approvedBy', 'fullName employeeCode')
        .lean();
    } else if (receiptType === 'voucher') {
      record = await JournalVoucher.findById(id)
        .populate('branchId', 'branchName branchCode address city state contactNumber')
        .populate('approvedBy', 'fullName employeeCode')
        .lean();
      entries = await LedgerEntry.find({ voucherId: id })
        .populate('accountHeadId', 'name code type')
        .populate('memberId', 'fullName memberNo')
        .lean();
    } else if (receiptType === 'expense') {
      record = await Expense.findById(id)
        .populate('branchId', 'branchName branchCode address city state contactNumber')
        .populate('accountHeadId', 'name code type')
        .populate('voucherId')
        .lean();
    } else if (receiptType === 'salary') {
      record = await SalaryPayment.findById(id)
        .populate('employeeId', 'fullName employeeCode designation department mobile')
        .populate('branchId', 'branchName branchCode address city state contactNumber')
        .populate('expenseId')
        .populate('voucherId')
        .lean();
    } else {
      throw AppError.validation('Unsupported receipt type');
    }

    if (!record) throw AppError.notFound('Receipt source record not found');

    const settings = await getSettings();
    return successResponse({
      type: receiptType,
      settings,
      record,
      entries,
      printedAt: new Date(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
