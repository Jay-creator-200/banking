import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { AppError } from '@/utils/error-handler.js';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb.js';
import Branch from '@/models/Branch.js';
import BusinessDayClosing from '@/models/BusinessDayClosing.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      throw AppError.unauthorized('Authentication required');
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || session.user.branchId;

    if (!branchId) {
      throw AppError.validation('Branch ID is required');
    }

    // Get current business date from branch
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw AppError.notFound('Branch not found');
    }

    // Get closing history
    const history = await BusinessDayClosing.find({ branchId })
      .sort({ date: -1 })
      .limit(30)
      .exec();

    return successResponse({
      currentBusinessDate: branch.currentBusinessDate || new Date('2026-06-15'),
      history,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
