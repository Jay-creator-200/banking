import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import Loan from '@/models/Loan.js';
import LoanSchedule from '@/models/LoanSchedule.js';
import LoanPayment from '@/models/LoanPayment.js';
import '@/models/LoanProduct.js';

export async function GET(req) {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const { searchParams } = new URL(req.url);
    const loanId = searchParams.get('loanId');

    if (loanId) {
      const loan = await Loan.findOne({ _id: loanId, memberId, isDeleted: false })
        .populate('loanProductId')
        .lean();
      
      if (!loan) {
        return NextResponse.json({ success: false, error: 'Loan not found or access denied' }, { status: 404 });
      }

      const schedule = await LoanSchedule.find({ loanId })
        .sort({ installmentNo: 1 })
        .lean();

      const payments = await LoanPayment.find({ loanId })
        .sort({ paidDate: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          loan,
          schedule,
          payments,
        },
      });
    }

    const loans = await Loan.find({ memberId, isDeleted: false })
      .populate('loanProductId')
      .sort({ disbursementDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: loans,
    });
  } catch (error) {
    console.error('[MEMBER LOANS GET ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
