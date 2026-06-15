import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import reconciliationService from '@/services/ReconciliationService.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import BankReconciliation from '@/models/BankReconciliation.js';

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles to import: SUPER_ADMIN, MANAGER
    if (!['SUPER_ADMIN', 'MANAGER'].includes(role)) {
      throw AppError.forbidden('Only Managers and Super Administrators can upload bank statements.');
    }

    const body = await req.json();
    const { bankAccount, statementDate, openingBalance, closingBalance, csvRows } = body;

    if (!bankAccount || !statementDate || !csvRows || !Array.isArray(csvRows)) {
      throw AppError.validation('Missing required bank statement fields or row data');
    }

    const result = await reconciliationService.uploadStatement({
      bankAccount,
      statementDate,
      openingBalance: parseFloat(openingBalance || '0'),
      closingBalance: parseFloat(closingBalance || '0'),
      csvRows,
      userId: session.user.id,
    });

    return successResponse(result, 201, { message: 'Bank statement processed successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const role = session.user.roleCode;
    // Authorized roles: SUPER_ADMIN, MANAGER, ACCOUNTANT, AUDITOR
    if (!['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR'].includes(role)) {
      throw AppError.forbidden('You do not have permission to view bank reconciliation statements');
    }

    const { searchParams } = new URL(req.url);
    const bankAccount = searchParams.get('bankAccount');

    const query = {};
    if (bankAccount) query.bankAccount = bankAccount;

    const list = await BankReconciliation.find(query).sort({ statementDate: -1 }).exec();

    return successResponse(list);
  } catch (error) {
    return errorResponse(error);
  }
}
