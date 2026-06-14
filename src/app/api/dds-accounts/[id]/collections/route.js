import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import ddsCollectionRepository from '@/repositories/DDSCollectionRepository.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'deposits.view')) {
      throw AppError.forbidden('You do not have permission to view DDS collections');
    }

    const { id } = await params;
    const collections = await ddsCollectionRepository.model
      .find({ ddsAccountId: id, isDeleted: false })
      .sort('-collectionDate')
      .populate('collectorId', 'fullName')
      .exec();

    return successResponse(collections);
  } catch (error) {
    return errorResponse(error);
  }
}
