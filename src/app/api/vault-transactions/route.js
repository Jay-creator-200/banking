import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import vaultService from '@/services/VaultService.js';
import vaultTransactionRepository from '@/repositories/VaultTransactionRepository.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'teller.view')) {
      throw AppError.forbidden('You do not have permission to view vault transactions');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const branchId = searchParams.get('branchId');

    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (searchParams.get('transactionType')) filter.transactionType = searchParams.get('transactionType').toUpperCase();
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filter.transactionDate = {
        $gte: new Date(searchParams.get('startDate')),
        $lte: new Date(searchParams.get('endDate')),
      };
    }

    const result = await vaultService.getVaultTransactions(filter, { page, limit });

    // Current vault balance
    const currentBalance = branchId ? await vaultService.getVaultBalance(branchId) : null;

    return successResponse(result.docs, 200, {
      total: result.total,
      limit: result.limit,
      page: result.page,
      pages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      currentBalance,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'vault.manage')) {
      throw AppError.forbidden('You do not have permission to post vault transactions');
    }

    const body = await req.json();
    const vtxn = await vaultService.postVaultTransaction(body, session.user.id);
    return successResponse(vtxn, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
