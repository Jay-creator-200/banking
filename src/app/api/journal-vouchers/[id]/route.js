import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import journalVoucherRepository from '@/repositories/JournalVoucherRepository.js';
import LedgerEntry from '@/models/LedgerEntry.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'accounting.view')) {
      throw AppError.forbidden('You do not have permission to view accounting records');
    }

    const { id } = await params;
    const voucher = await journalVoucherRepository.findDetailById(id);
    if (!voucher) {
      throw AppError.notFound('Journal voucher not found');
    }

    // Load ledger entries for this voucher
    const entries = await LedgerEntry.find({ voucherId: id })
      .populate('accountHeadId')
      .exec();

    const voucherObj = voucher.toObject ? voucher.toObject() : voucher;

    return successResponse({
      ...voucherObj,
      entries,
    }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
