import { auth } from '@/auth.js';
import { successResponse, errorResponse } from '@/utils/api-response.js';
import { hasPermission } from '@/utils/rbac.js';
import { AppError } from '@/utils/error-handler.js';
import dbConnect from '@/lib/mongodb.js';
import ReceiptSetting from '@/models/ReceiptSetting.js';

const defaults = {
  templateName: 'Default Banking Receipt',
  institutionName: 'Noble Cooperative Society',
  institutionAddress: '',
  contactLine: '',
  logoUrl: '',
  receiptSize: 'A4',
  showLogo: true,
  showWatermark: true,
  footerNote: 'This is a computer generated receipt and does not require a physical signature.',
  authorizedSignatoryLabel: 'Authorized Signatory',
};

async function getSettings() {
  let settings = await ReceiptSetting.findOne({ isDeleted: { $ne: true } });
  if (!settings) {
    settings = await ReceiptSetting.create(defaults);
  }
  return settings;
}

export async function GET() {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'transaction.view')) {
      throw AppError.forbidden('You do not have permission to view receipt settings');
    }
    const settings = await getSettings();
    return successResponse(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const session = await auth();
    if (!hasPermission(session, 'user.update')) {
      throw AppError.forbidden('You do not have permission to update receipt settings');
    }

    const body = await req.json();
    const settings = await getSettings();
    Object.assign(settings, {
      templateName: body.templateName ?? settings.templateName,
      institutionName: body.institutionName ?? settings.institutionName,
      institutionAddress: body.institutionAddress ?? settings.institutionAddress,
      contactLine: body.contactLine ?? settings.contactLine,
      logoUrl: body.logoUrl ?? settings.logoUrl,
      receiptSize: body.receiptSize ?? settings.receiptSize,
      showLogo: body.showLogo ?? settings.showLogo,
      showWatermark: body.showWatermark ?? settings.showWatermark,
      footerNote: body.footerNote ?? settings.footerNote,
      authorizedSignatoryLabel: body.authorizedSignatoryLabel ?? settings.authorizedSignatoryLabel,
      updatedBy: session.user.id,
    });
    await settings.save();
    return successResponse(settings, 200, { message: 'Receipt layout updated successfully' });
  } catch (error) {
    return errorResponse(error);
  }
}
