import { NextResponse } from 'next/server';
import ReminderEngineInstance from '@/services/ReminderEngine.js';
import connectDB from '@/lib/mongodb.js';
import auditLogService from '@/services/AuditLogService.js';

export async function POST(req) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET || 'banking_cron_secret_2026';
    const clientSecret = authHeader.replace('Bearer ', '').trim();

    if (clientSecret !== cronSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const job = searchParams.get('job') || 'all';

    let emiCount = 0;
    let maturityCount = 0;

    if (job === 'emi-reminders' || job === 'all') {
      emiCount = await ReminderEngineInstance.runEMIReminders();
    }

    if (job === 'maturity-reminders' || job === 'all') {
      maturityCount = await ReminderEngineInstance.runMaturityReminders();
    }

    try {
      await auditLogService.log({
        userId: 'SYSTEM',
        action: 'CRON_JOB_EXECUTED',
        module: 'JOBS',
        description: `Executed scheduled background cron job. Type: ${job}. Reminders sent - EMI: ${emiCount}, Maturity: ${maturityCount}.`,
      });
    } catch (auditErr) {
      console.warn('Failed to audit log cron execution:', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      job,
      summary: {
        emiRemindersSent: emiCount,
        maturityRemindersSent: maturityCount,
      },
    });
  } catch (error) {
    console.error('[CRON JOB ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
