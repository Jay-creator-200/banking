import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import NotificationPreference from '@/models/NotificationPreference.js';
import auditLogService from '@/services/AuditLogService.js';

export async function GET() {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    let prefs = await NotificationPreference.findOne({ memberId, isDeleted: false });

    if (!prefs) {
      prefs = await NotificationPreference.create({
        memberId,
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        transactionAlerts: true,
        loanAlerts: true,
        depositAlerts: true,
        marketingAlerts: false,
      });
    }

    return NextResponse.json({ success: true, data: prefs });
  } catch (error) {
    console.error('[MEMBER PREFERENCES GET ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const body = await req.json();

    let prefs = await NotificationPreference.findOne({ memberId, isDeleted: false });
    if (!prefs) {
      prefs = new NotificationPreference({ memberId });
    }

    const oldPrefs = prefs.toObject ? prefs.toObject() : { ...prefs };

    prefs.smsEnabled = body.smsEnabled !== undefined ? body.smsEnabled : prefs.smsEnabled;
    prefs.emailEnabled = body.emailEnabled !== undefined ? body.emailEnabled : prefs.emailEnabled;
    prefs.whatsappEnabled = body.whatsappEnabled !== undefined ? body.whatsappEnabled : prefs.whatsappEnabled;
    prefs.transactionAlerts = body.transactionAlerts !== undefined ? body.transactionAlerts : prefs.transactionAlerts;
    prefs.loanAlerts = body.loanAlerts !== undefined ? body.loanAlerts : prefs.loanAlerts;
    prefs.depositAlerts = body.depositAlerts !== undefined ? body.depositAlerts : prefs.depositAlerts;
    prefs.marketingAlerts = body.marketingAlerts !== undefined ? body.marketingAlerts : prefs.marketingAlerts;

    await prefs.save();

    try {
      await auditLogService.log({
        userId: session.user.id,
        action: 'MEMBER_PREFERENCE_CHANGED',
        module: 'COMMUNICATIONS',
        entityId: prefs._id.toString(),
        description: `Member ${session.user.username} modified notification channel settings.`,
      });
    } catch (auditErr) {
      console.warn('Failed to audit log preference update:', auditErr.message);
    }

    return NextResponse.json({ success: true, data: prefs });
  } catch (error) {
    console.error('[MEMBER PREFERENCES PUT ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
