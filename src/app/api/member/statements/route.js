import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import DigitalStatement from '@/models/DigitalStatement.js';

export async function GET() {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const statements = await DigitalStatement.find({ memberId, isDeleted: false })
      .sort({ generatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: statements,
    });
  } catch (error) {
    console.error('[MEMBER GET STATEMENTS ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
