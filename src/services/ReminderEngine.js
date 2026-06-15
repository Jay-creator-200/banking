import mongoose from 'mongoose';
import NotificationServiceInstance from './NotificationService.js';
import NotificationPreference from '../models/NotificationPreference.js';
import Member from '../models/Member.js';
import LoanSchedule from '../models/LoanSchedule.js';
import Loan from '../models/Loan.js';
import FDAccount from '../models/FDAccount.js';
import RDAccount from '../models/RDAccount.js';
import DDSAccount from '../models/DDSAccount.js';
import MISAccount from '../models/MISAccount.js';
import WhatsAppServiceInstance from './WhatsAppService.js';
import EmailServiceInstance from './EmailService.js';
import auditLogService from './AuditLogService.js';

export class ReminderEngine {
  _getDayRange(daysOffset) {
    const start = new Date();
    start.setDate(start.getDate() + daysOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setDate(end.getDate() + daysOffset);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  async runEMIReminders() {
    console.log('[ReminderEngine] Running EMI Reminder scans...');
    let remindersCount = 0;

    // Scan for 7, 3, and 1 days before due date
    const offsets = [7, 3, 1];
    for (const offset of offsets) {
      const range = this._getDayRange(offset);
      const schedules = await LoanSchedule.find({
        dueDate: { $gte: range.start, $lte: range.end },
        paymentStatus: { $in: ['pending', 'partial'] },
      }).populate('loanId');

      for (const sched of schedules) {
        if (!sched.loanId) continue;
        const success = await this._dispatchEMIReminder(sched.loanId, sched, `${offset} days before due`);
        if (success) remindersCount++;
      }
    }

    // Scan for overdue (dueDate < today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const overdueSchedules = await LoanSchedule.find({
      dueDate: { $lt: todayStart },
      paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
    }).populate('loanId');

    for (const sched of overdueSchedules) {
      if (!sched.loanId) continue;
      const success = await this._dispatchEMIReminder(sched.loanId, sched, 'overdue');
      if (success) remindersCount++;
    }

    console.log(`[ReminderEngine] EMI scan completed. Total reminders generated: ${remindersCount}`);
    return remindersCount;
  }

  async _dispatchEMIReminder(loan, schedule, typeLabel) {
    try {
      const member = await Member.findById(loan.memberId);
      if (!member) return false;

      let prefs = await NotificationPreference.findOne({ memberId: member._id });
      if (!prefs) {
        prefs = await NotificationPreference.create({
          memberId: member._id,
          smsEnabled: true,
          emailEnabled: true,
          whatsappEnabled: true,
          loanAlerts: true,
        });
      }

      if (!prefs.loanAlerts) return false;

      const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(schedule.totalDue - schedule.paidAmount);
      const dueDateStr = new Date(schedule.dueDate).toLocaleDateString('en-IN');
      
      let message = '';
      if (typeLabel === 'overdue') {
        message = `URGENT: Your loan EMI for account ${loan.loanNo} is OVERDUE. Outstanding: ${formattedAmount}. Please repay immediately to avoid further penalties.`;
      } else {
        message = `Reminder: Your EMI of ${formattedAmount} for loan account ${loan.loanNo} is due on ${dueDateStr}. (${typeLabel}).`;
      }

      if (prefs.smsEnabled && member.mobile) {
        await NotificationServiceInstance.sendNotification({
          memberId: member._id,
          type: 'SMS',
          category: 'reminder',
          title: 'Loan Payment Reminder',
          message,
        });
      }

      if (prefs.whatsappEnabled && member.mobile) {
        try {
          await WhatsAppServiceInstance.sendEMIDueAlert(
            member.mobile,
            member.fullName,
            formattedAmount,
            dueDateStr,
            loan.loanNo
          );
          // Log WhatsApp notification record
          await NotificationServiceInstance.repository.create({
            notificationNo: await mongoose.model('Sequence').nextCount ? '' : `NTF-${Date.now()}`,
            memberId: member._id,
            type: 'WHATSAPP',
            category: 'reminder',
            title: 'Loan Payment Reminder',
            message,
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (wsErr) {
          console.error('[ReminderEngine] WhatsApp alert fail:', wsErr.message);
        }
      }

      if (prefs.emailEnabled && member.email) {
        try {
          await EmailServiceInstance.sendLoanPaymentReceipt(member.email, member.fullName, {
            loanNo: loan.loanNo,
            installmentNo: schedule.installmentNo,
            paidAmount: schedule.totalDue,
            paidDate: dueDateStr,
            outstandingAmount: loan.outstandingPrincipal + loan.outstandingInterest,
          });
          
          await NotificationServiceInstance.repository.create({
            notificationNo: `NTF-${Date.now()}`,
            memberId: member._id,
            type: 'EMAIL',
            category: 'reminder',
            title: 'Loan Payment Reminder',
            message,
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (emailErr) {
          console.error('[ReminderEngine] Email alert fail:', emailErr.message);
        }
      }

      return true;
    } catch (err) {
      console.error('[ReminderEngine] Failed to dispatch EMI reminder:', err.message);
      return false;
    }
  }

  async runMaturityReminders() {
    console.log('[ReminderEngine] Running Deposit Maturity scans...');
    let remindersCount = 0;

    const offsets = [30, 15, 7];
    const collections = [
      { model: FDAccount, type: 'fd' },
      { model: RDAccount, type: 'rd' },
      { model: DDSAccount, type: 'dds' },
      { model: MISAccount, type: 'mis' },
    ];

    for (const offset of offsets) {
      const range = this._getDayRange(offset);

      for (const col of collections) {
        const accounts = await col.model.find({
          status: 'active',
          maturityDate: { $gte: range.start, $lte: range.end },
        });

        for (const acc of accounts) {
          const success = await this._dispatchMaturityReminder(acc, col.type, offset);
          if (success) remindersCount++;
        }
      }
    }

    console.log(`[ReminderEngine] Deposit maturity scan completed. Total alerts generated: ${remindersCount}`);
    return remindersCount;
  }

  async _dispatchMaturityReminder(account, depositType, daysLeft) {
    try {
      const member = await Member.findById(account.memberId);
      if (!member) return false;

      let prefs = await NotificationPreference.findOne({ memberId: member._id });
      if (!prefs) {
        prefs = await NotificationPreference.create({
          memberId: member._id,
          smsEnabled: true,
          emailEnabled: true,
          whatsappEnabled: true,
          depositAlerts: true,
        });
      }

      if (!prefs.depositAlerts) return false;

      const accountNo = account.fdAccountNo || account.rdAccountNo || account.ddsAccountNo || account.misAccountNo;
      const principal = account.principalAmount || account.monthlyInstallment || account.dailyAmount;
      const maturity = account.maturityAmount || (principal * (account.tenureMonths || 12));
      const maturityDateStr = new Date(account.maturityDate).toLocaleDateString('en-IN');
      const formattedMaturity = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(maturity);
      
      const message = `Alert: Your ${depositType.toUpperCase()} account ${accountNo} matures in ${daysLeft} days on ${maturityDateStr}. Est Proceeds: ${formattedMaturity}.`;

      if (prefs.smsEnabled && member.mobile) {
        await NotificationServiceInstance.sendNotification({
          memberId: member._id,
          type: 'SMS',
          category: 'reminder',
          title: 'Deposit Maturity Reminder',
          message,
        });
      }

      if (prefs.whatsappEnabled && member.mobile) {
        try {
          await WhatsAppServiceInstance.sendMaturityAlert(
            member.mobile,
            member.fullName,
            accountNo,
            maturityDateStr,
            formattedMaturity
          );
          await NotificationServiceInstance.repository.create({
            notificationNo: `NTF-${Date.now()}`,
            memberId: member._id,
            type: 'WHATSAPP',
            category: 'reminder',
            title: 'Deposit Maturity Reminder',
            message,
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (wsErr) {
          console.error('[ReminderEngine] WhatsApp maturity alert fail:', wsErr.message);
        }
      }

      if (prefs.emailEnabled && member.email) {
        try {
          await EmailServiceInstance.sendMaturityReminder(member.email, member.fullName, {
            accountNo,
            depositType,
            principalAmount: principal,
            maturityDate: maturityDateStr,
            maturityAmount: maturity,
          });

          await NotificationServiceInstance.repository.create({
            notificationNo: `NTF-${Date.now()}`,
            memberId: member._id,
            type: 'EMAIL',
            category: 'reminder',
            title: 'Deposit Maturity Reminder',
            message,
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (emailErr) {
          console.error('[ReminderEngine] Email maturity alert fail:', emailErr.message);
        }
      }

      return true;
    } catch (err) {
      console.error('[ReminderEngine] Failed to dispatch maturity reminder:', err.message);
      return false;
    }
  }

  async sendSecurityAlert(details) {
    const { memberId, userId, action, ip, userAgent } = details;
    const message = `Security Alert: A security event [${action}] was detected on your account. IP: ${ip || 'Unknown'}. If this was not you, please contact support.`;
    
    let email = '';
    let mobile = '';
    let targetMemberId = null;

    if (memberId) {
      const member = await Member.findById(memberId);
      if (member) {
        email = member.email;
        mobile = member.mobile;
        targetMemberId = member._id;
      }
    } else if (userId) {
      const User = mongoose.model('User');
      const user = await User.findById(userId);
      if (user) {
        email = user.email;
        mobile = user.mobile;
      }
    }

    if (!email && !mobile) return;

    try {
      if (mobile) {
        await NotificationServiceInstance.sendNotification({
          memberId: targetMemberId,
          type: 'SMS',
          category: 'security',
          title: `Security Alert - ${action}`,
          message,
        });
      }
      if (email) {
        await NotificationServiceInstance.sendNotification({
          memberId: targetMemberId,
          type: 'EMAIL',
          category: 'security',
          title: `Security Alert - ${action}`,
          message,
        });
      }
      
      // Log Security Audit Event
      await auditLogService.log({
        userId: userId || 'SYSTEM',
        action: 'SECURITY_ALERT_SENT',
        module: 'SECURITY',
        entityId: targetMemberId ? targetMemberId.toString() : (userId ? userId.toString() : 'SYSTEM'),
        description: `Dispatched security alert for ${action} to email/mobile.`,
      });
    } catch (err) {
      console.error('[ReminderEngine] Failed to dispatch security alert:', err.message);
    }
  }
}

const reminderEngineInstance = new ReminderEngine();
export default reminderEngineInstance;
export { reminderEngineInstance as ReminderEngineInstance };
