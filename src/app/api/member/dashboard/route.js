import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import SavingsAccount from '@/models/SavingsAccount.js';
import Loan from '@/models/Loan.js';
import FDAccount from '@/models/FDAccount.js';
import RDAccount from '@/models/RDAccount.js';
import DDSAccount from '@/models/DDSAccount.js';
import MISAccount from '@/models/MISAccount.js';
import Transaction from '@/models/Transaction.js';

export async function GET() {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;

    // 1. Savings Accounts
    const savingsAccounts = await SavingsAccount.find({ memberId, isDeleted: false });
    const savingsBalance = savingsAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    // 2. Loan Accounts
    const loans = await Loan.find({ memberId, loanStatus: { $in: ['active', 'overdue'] }, isDeleted: false });
    const loanOutstanding = loans.reduce((sum, ln) => sum + (ln.outstandingPrincipal || 0) + (ln.outstandingInterest || 0), 0);

    // 3. Deposit Accounts (FD, RD, DDS, MIS)
    const fds = await FDAccount.find({ memberId, status: 'active', isDeleted: false });
    const rds = await RDAccount.find({ memberId, status: 'active', isDeleted: false });
    const dds = await DDSAccount.find({ memberId, status: 'active', isDeleted: false });
    const mis = await MISAccount.find({ memberId, status: 'active', isDeleted: false });

    const fdInvested = fds.reduce((sum, acc) => sum + (acc.principalAmount || 0), 0);
    const rdInvested = rds.reduce((sum, acc) => sum + (acc.totalDepositAmount || acc.monthlyInstallment || 0), 0);
    const ddsInvested = dds.reduce((sum, acc) => sum + (acc.totalDeposit || acc.dailyAmount || 0), 0);
    const misInvested = mis.reduce((sum, acc) => sum + (acc.principalAmount || 0), 0);

    const depositInvestments = fdInvested + rdInvested + ddsInvested + misInvested;

    // 4. Recent Posted Transactions
    const transactions = await Transaction.find({ memberId, status: 'POSTED' })
      .sort({ approvedAt: -1, _id: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        savingsBalance,
        loanOutstanding,
        depositInvestments,
        recentTransactions: transactions,
        accountsSummary: {
          savingsCount: savingsAccounts.length,
          loansCount: loans.length,
          depositsCount: fds.length + rds.length + dds.length + mis.length,
        }
      }
    });
  } catch (error) {
    console.error('[MEMBER DASHBOARD API ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
