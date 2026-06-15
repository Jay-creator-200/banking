import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import FDAccount from '@/models/FDAccount.js';
import RDAccount from '@/models/RDAccount.js';
import DDSAccount from '@/models/DDSAccount.js';
import MISAccount from '@/models/MISAccount.js';
import '@/models/DepositScheme.js';

export async function GET() {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;

    const fds = await FDAccount.find({ memberId, isDeleted: false }).populate('schemeId').lean();
    const rds = await RDAccount.find({ memberId, isDeleted: false }).populate('schemeId').lean();
    const dds = await DDSAccount.find({ memberId, isDeleted: false }).populate('schemeId').lean();
    const mis = await MISAccount.find({ memberId, isDeleted: false }).populate('schemeId').lean();

    return NextResponse.json({
      success: true,
      data: {
        fds,
        rds,
        dds,
        mis,
      },
    });
  } catch (error) {
    console.error('[MEMBER DEPOSITS GET ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
