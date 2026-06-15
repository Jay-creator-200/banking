import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import Notification from '@/models/Notification.js';
import NotificationServiceInstance from '@/services/NotificationService.js';
import { hasPermission } from '@/utils/rbac.js';

export async function GET(req) {
  try {
    await connectDB();
    const session = await auth();

    // Enforce communications view permission (or general admin check)
    if (!session || (!hasPermission(session, 'communications.view') && session.user?.roleCode !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    if (memberId) query.memberId = memberId;
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    const items = await Notification.find(query)
      .populate('memberId', 'fullName memberNo mobile email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[ADMIN GET NOTIFICATIONS ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await auth();

    if (!session || (!hasPermission(session, 'communications.send') && session.user?.roleCode !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, type, category, title, message } = body;

    if (!type || !category || !title || !message) {
      return NextResponse.json({ success: false, error: 'Missing required notification fields' }, { status: 400 });
    }

    const notification = await NotificationServiceInstance.sendNotification({
      memberId,
      userId: session.user.id,
      type,
      category,
      title,
      message,
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('[ADMIN SEND NOTIFICATION ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
