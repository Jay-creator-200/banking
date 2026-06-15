import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import Member from '@/models/Member.js';
import NotificationServiceInstance from '@/services/NotificationService.js';
import { hasPermission } from '@/utils/rbac.js';
import auditLogService from '@/services/AuditLogService.js';

export async function POST(req) {
  try {
    await connectDB();
    const session = await auth();

    if (!session || (!hasPermission(session, 'communications.send') && session.user?.roleCode !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { memberCategory, type, category, title, message } = body;

    if (!memberCategory || !type || !category || !title || !message) {
      return NextResponse.json({ success: false, error: 'Missing required broadcast parameters' }, { status: 400 });
    }

    const query = { memberStatus: 'active', isDeleted: false };
    if (memberCategory !== 'all') {
      query.memberCategory = memberCategory;
    }

    const members = await Member.find(query).lean();
    console.log(`[Admin Bulk SMS] Dispatching to ${members.length} members...`);

    // Asynchronously dispatch notifications in parallel batches to prevent gateway blocks
    let dispatched = 0;
    const batchSize = 10;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      await Promise.all(
        batch.map((mbr) =>
          NotificationServiceInstance.sendNotification({
            memberId: mbr._id,
            userId: session.user.id,
            type,
            category,
            title,
            message,
          }).then(() => {
            dispatched++;
          }).catch((err) => {
            console.error(`Failed to send bulk notification to member ${mbr._id}:`, err.message);
          })
        )
      );
    }

    try {
      await auditLogService.log({
        userId: session.user.id,
        action: 'NOTIFICATION_SENT',
        module: 'COMMUNICATIONS',
        description: `Dispatched bulk ${type} notification broadcast to ${dispatched} members under category: ${memberCategory}.`,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      summary: {
        recipientsCount: members.length,
        dispatchedCount: dispatched,
      },
    });
  } catch (error) {
    console.error('[ADMIN BULK BROADCAST ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
