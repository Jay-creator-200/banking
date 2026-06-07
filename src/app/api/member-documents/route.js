import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import memberDocumentService from '@/services/MemberDocumentService.js';
import uploadService from '@/services/UploadService.js';
import { validateFile } from '@/utils/file-helper.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';

export async function GET(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.view')) {
      throw AppError.forbidden('You do not have permission to view member documents');
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      throw AppError.validation('memberId query parameter is required');
    }

    const docs = await memberDocumentService.getDocuments(memberId);
    return successResponse(docs, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'member.create')) {
      throw AppError.forbidden('You do not have permission to upload member documents');
    }

    const contentType = req.headers.get('content-type') || '';
    let doc;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      const memberId = formData.get('memberId');
      const documentType = formData.get('documentType');
      const documentName = formData.get('documentName');

      if (!file || !memberId || !documentType || !documentName) {
        throw AppError.validation('Missing required fields: file, memberId, documentType, documentName');
      }

      // Check category: photo/signature are images, others can be documents (PDFs, images)
      const category = ['photo', 'signature'].includes(documentType) ? 'IMAGE' : 'DOCUMENT';
      const validation = validateFile(file.size, file.type, category);
      if (!validation.valid) {
        throw AppError.validation(validation.error);
      }

      // Upload file to Cloudinary
      const folderName = `kyc/${memberId}`;
      const uploadResult = ['photo', 'signature'].includes(documentType)
        ? await uploadService.uploadImage(file, folderName)
        : await uploadService.uploadDocument(file, folderName);

      // Register link
      doc = await memberDocumentService.uploadDoc({
        memberId,
        documentType,
        documentName,
        cloudinaryUrl: uploadResult.url,
      }, session.user.id);
    } else {
      // Expecting JSON body matching uploadDocumentSchema
      const body = await req.json();
      doc = await memberDocumentService.uploadDoc(body, session.user.id);
    }

    return successResponse(doc, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
