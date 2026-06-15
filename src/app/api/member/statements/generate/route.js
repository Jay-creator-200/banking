import { NextResponse } from 'next/server';
import { auth } from '@/auth.js';
import connectDB from '@/lib/mongodb.js';
import DocumentGeneratorServiceInstance from '@/services/DocumentGeneratorService.js';
import SavingsAccount from '@/models/SavingsAccount.js';
import Loan from '@/models/Loan.js';
import FDAccount from '@/models/FDAccount.js';
import RDAccount from '@/models/RDAccount.js';

export async function POST(req) {
  try {
    await connectDB();
    const session = await auth();

    if (!session || session.user?.roleCode !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = session.user.id;
    const body = await req.json();

    const { accountType, accountId, startDate, endDate, format = 'pdf' } = body;

    if (!accountType || !accountId) {
      return NextResponse.json({ success: false, error: 'Missing accountType or accountId parameters' }, { status: 400 });
    }

    // Verify account ownership
    let hasAccess = false;
    if (accountType === 'savings') {
      const acc = await SavingsAccount.findById(accountId);
      if (acc && acc.memberId.toString() === memberId) hasAccess = true;
    } else if (accountType === 'loan') {
      const acc = await Loan.findById(accountId);
      if (acc && acc.memberId.toString() === memberId) hasAccess = true;
    } else if (accountType === 'fd') {
      const acc = await FDAccount.findById(accountId);
      if (acc && acc.memberId.toString() === memberId) hasAccess = true;
    } else if (accountType === 'rd') {
      const acc = await RDAccount.findById(accountId);
      if (acc && acc.memberId.toString() === memberId) hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Access denied: account does not belong to member' }, { status: 403 });
    }

    let statementDoc;

    if (accountType === 'savings') {
      statementDoc = await DocumentGeneratorServiceInstance.generateSavingsStatement({
        accountId,
        startDate,
        endDate,
        format,
      });
    } else if (accountType === 'loan') {
      statementDoc = await DocumentGeneratorServiceInstance.generateLoanStatement({
        loanId: accountId,
        format,
      });
    } else if (accountType === 'fd' || accountType === 'rd') {
      statementDoc = await DocumentGeneratorServiceInstance.generateDepositCertificate({
        depositId: accountId,
        depositType: accountType,
      });
    }

    return NextResponse.json({
      success: true,
      data: statementDoc,
    });
  } catch (error) {
    console.error('[MEMBER STATEMENT GENERATION ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
