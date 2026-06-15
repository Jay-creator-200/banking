import BaseService from './BaseService.js';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import Member from '../models/Member.js';
import Transaction from '../models/Transaction.js';
import SMSProviderFactory from './SMSProvider.js';
import EmailServiceInstance from './EmailService.js';
import WhatsAppServiceInstance from './WhatsAppService.js';
import sequenceService from './SequenceService.js';
import mongoose from 'mongoose';
import auditLogService from './AuditLogService.js';

export class NotificationService extends BaseService {
  constructor() {
    super(mongoose.models.Notification || mongoose.model('Notification'));
  }

  async sendSMS(mobile, message) {
    const provider = SMSProviderFactory.getProvider();
    return await provider.send(mobile, message);
  }

  async sendEmail(email, subject, body, html = '') {
    return await EmailServiceInstance.sendMail(email, subject, html || body);
  }

  async sendWhatsApp(mobile, message) {
    return await WhatsAppServiceInstance.sendTemplateMessage(mobile, 'general_alert', [
      {
        type: 'body',
        parameters: [{ type: 'text', text: message }],
      },
    ]);
  }

  async sendNotification(options) {
    const { memberId, userId, type, category, title, message } = options;
    const notificationNo = await sequenceService.generateSequence('NTF', null);

    const notification = await this.repository.create({
      notificationNo,
      memberId: memberId || null,
      userId: userId || null,
      type,
      category,
      title,
      message,
      status: 'pending',
    });

    let success = false;
    let recipient = '';

    if (memberId) {
      const member = await Member.findById(memberId);
      if (member) {
        if (type === 'SMS') recipient = member.mobile;
        if (type === 'EMAIL') recipient = member.email;
        if (type === 'WHATSAPP') recipient = member.mobile;
      }
    } else if (userId) {
      const User = mongoose.model('User');
      const user = await User.findById(userId);
      if (user) {
        if (type === 'SMS') recipient = user.mobile;
        if (type === 'EMAIL') recipient = user.email;
        if (type === 'WHATSAPP') recipient = user.mobile;
      }
    }

    if (!recipient) {
      notification.status = 'failed';
      await notification.save();
      return notification;
    }

    try {
      if (type === 'SMS') {
        success = await this.sendSMS(recipient, message);
      } else if (type === 'EMAIL') {
        success = await this.sendEmail(recipient, title, message);
      } else if (type === 'WHATSAPP') {
        success = await this.sendWhatsApp(recipient, message);
      } else {
        success = true;
      }

      notification.status = success ? 'sent' : 'failed';
      notification.sentAt = success ? new Date() : null;
      await notification.save();

      try {
        await auditLogService.log({
          userId: userId || 'SYSTEM',
          action: 'NOTIFICATION_SENT',
          module: 'COMMUNICATIONS',
          entityId: notification._id.toString(),
          description: `Dispatched ${type} notification ${notificationNo} to ${recipient}. Status: ${notification.status}`,
        });
      } catch (auditErr) {
        console.warn('Failed to write audit log for notification dispatch:', auditErr.message);
      }
    } catch (err) {
      console.error('Failed to send message:', err.message);
      notification.status = 'failed';
      await notification.save();
    }

    return notification;
  }

  async markAsRead(notificationId) {
    const notification = await this.repository.findById(notificationId);
    if (!notification) throw new Error('Notification not found');
    notification.status = 'read';
    return await notification.save();
  }

  async getUserNotifications(memberId, options = {}) {
    return await this.repository.findMany({ memberId, isDeleted: false }, options);
  }

  async triggerTransactionAlert(transactionId) {
    console.log('[NotificationService] Processing transaction alert for txn:', transactionId);
    const txn = await Transaction.findById(transactionId);
    if (!txn) {
      console.warn('[NotificationService] Transaction not found:', transactionId);
      return;
    }

    if (txn.status !== 'POSTED') {
      console.warn('[NotificationService] Transaction is not POSTED:', txn.status);
      return;
    }

    if (!txn.memberId) {
      console.log('[NotificationService] Transaction has no member link');
      return;
    }

    const member = await Member.findById(txn.memberId);
    if (!member) {
      console.warn('[NotificationService] Member not found for transaction:', txn.memberId);
      return;
    }

    let prefs = await NotificationPreference.findOne({ memberId: member._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({
        memberId: member._id,
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        transactionAlerts: true,
        loanAlerts: true,
        depositAlerts: true,
      });
    }

    if (!prefs.transactionAlerts) {
      console.log('[NotificationService] Member has disabled transaction alerts');
      return;
    }

    const isCredit = [
      'SAVINGS_DEPOSIT', 'INTEREST_CREDIT', 'RD_DEPOSIT', 'RD_DEPOSIT_TRANSFER',
      'FD_DEPOSIT', 'FD_DEPOSIT_TRANSFER', 'DDS_DEPOSIT', 'DDS_DEPOSIT_TRANSFER',
      'MIS_DEPOSIT', 'MIS_DEPOSIT_TRANSFER', 'MIS_PAYOUT_TRANSFER'
    ].includes(txn.transactionType);

    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(txn.amount);
    const dateStr = new Date(txn.approvedAt || txn.createdAt).toLocaleDateString('en-IN');
    
    const alertMessage = `${isCredit ? 'Credit' : 'Debit'} alert: Your account ${txn.accountId} has been ${isCredit ? 'credited' : 'debited'} with ${formattedAmount} on ${dateStr}. Ref: ${txn.transactionNo}.`;
    const emailTxnDetails = {
      transactionNo: txn.transactionNo,
      accountId: txn.accountId,
      transactionType: txn.transactionType,
      paymentMode: txn.paymentMode,
      amount: txn.amount,
      balanceAfter: txn.balanceAfter,
      narration: txn.narration,
      isCredit,
    };

    if (prefs.smsEnabled && member.mobile) {
      await this.sendNotification({
        memberId: member._id,
        type: 'SMS',
        category: 'transaction',
        title: 'Transaction Alert',
        message: alertMessage,
      });
    }

    if (prefs.whatsappEnabled && member.mobile) {
      try {
        const title = 'Transaction Alert';
        const notificationNo = await sequenceService.generateSequence('NTF', null);
        const notification = await this.repository.create({
          notificationNo,
          memberId: member._id,
          type: 'WHATSAPP',
          category: 'transaction',
          title,
          message: alertMessage,
          status: 'pending',
        });

        const success = await WhatsAppServiceInstance.sendDepositConfirmation(
          member.mobile,
          member.fullName,
          formattedAmount,
          txn.accountId
        );

        notification.status = success ? 'sent' : 'failed';
        notification.sentAt = success ? new Date() : null;
        await notification.save();
      } catch (err) {
        console.error('[NotificationService] WhatsApp trigger fail:', err.message);
      }
    }

    if (prefs.emailEnabled && member.email) {
      try {
        const title = 'Transaction Alert';
        const notificationNo = await sequenceService.generateSequence('NTF', null);
        const notification = await this.repository.create({
          notificationNo,
          memberId: member._id,
          type: 'EMAIL',
          category: 'transaction',
          title,
          message: alertMessage,
          status: 'pending',
        });

        const success = await EmailServiceInstance.sendTransactionReceipt(
          member.email,
          member.fullName,
          emailTxnDetails
        );

        notification.status = success ? 'sent' : 'failed';
        notification.sentAt = success ? new Date() : null;
        await notification.save();
      } catch (err) {
        console.error('[NotificationService] Email trigger fail:', err.message);
      }
    }
  }
}

const notificationServiceInstance = new NotificationService();
export default notificationServiceInstance;
export { notificationServiceInstance as NotificationServiceInstance };
