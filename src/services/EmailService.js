import nodemailer from 'nodemailer';

export class EmailService {
  constructor() {
    this.from = process.env.EMAIL_FROM || '"Apex Cooperative Bank" <no-reply@cooperative.co.in>';
    this.provider = process.env.EMAIL_PROVIDER || 'mock';
    
    if (this.provider === 'smtp' && process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendMail(to, subject, htmlContent) {
    console.log(`[Email Service] Sending mail to ${to} with subject "${subject}"`);
    if (this.provider === 'smtp' && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.from,
          to,
          subject,
          html: htmlContent,
        });
        console.log('[Email Service] Live SMTP Sent:', info.messageId);
        return true;
      } catch (err) {
        console.error('[Email Service] Live SMTP Fail:', err.message);
        return false;
      }
    } else {
      console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\nBody Preview: ${htmlContent.substring(0, 200).replace(/\s+/g, ' ')}...`);
      return true;
    }
  }

  _wrapTemplate(title, bodyContent) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%);
            padding: 30px 40px;
            color: #ffffff;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #c7d2fe;
            font-weight: bold;
          }
          .content {
            padding: 40px;
            line-height: 1.6;
            font-size: 14px;
          }
          .footer {
            background-color: #f1f5f9;
            padding: 20px 40px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .button {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 20px;
            font-size: 13px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th {
            text-align: left;
            padding: 10px;
            background-color: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            color: #475569;
            font-weight: bold;
            font-size: 12px;
          }
          .table td {
            padding: 12px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">APEX COOPERATIVE BANK</div>
            <div class="subtitle">${title}</div>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            © 2026 Apex Cooperative Bank. All rights reserved.<br>
            This is an automated transaction notification. Please do not reply directly to this mail.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcomeEmail(to, memberName, memberNo, loginUsername) {
    const title = 'Welcome to Apex Digital Banking';
    const body = `
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>Welcome to the Apex Cooperative Bank family! We are thrilled to have you as a member.</p>
      <p>Your membership profile has been successfully registered under membership number <strong>${memberNo}</strong>.</p>
      <p>Your digital portal access has been initialized. You can log in using the following details:</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px dashed #cbd5e1;">
        <p style="margin: 0 0 10px 0;"><strong>Portal URL:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/member/login">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/member/login</a></p>
        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> ${loginUsername}</p>
        <p style="margin: 0;"><strong>Password:</strong> The temporary password set during enrollment.</p>
      </div>
      <p>We advise you to log in and change your password upon your first sign-in to secure your account.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/member/login" class="button">Access Member Portal</a>
    `;
    return this.sendMail(to, title, this._wrapTemplate(title, body));
  }

  async sendTransactionReceipt(to, memberName, txnDetails) {
    const title = 'Transaction Alert Receipt';
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(txnDetails.amount);
    const formattedBalance = txnDetails.balanceAfter !== undefined && txnDetails.balanceAfter !== null
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(txnDetails.balanceAfter)
      : 'N/A';

    const body = `
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>This is to confirm that a transaction has been posted to your account <strong>${txnDetails.accountId}</strong>.</p>
      <table class="table">
        <tr><th>Parameter</th><th>Details</th></tr>
        <tr><td>Transaction No</td><td><strong>${txnDetails.transactionNo}</strong></td></tr>
        <tr><td>Type</td><td>${txnDetails.transactionType.replace(/_/g, ' ')}</td></tr>
        <tr><td>Payment Mode</td><td>${txnDetails.paymentMode}</td></tr>
        <tr><td>Amount</td><td style="color: ${txnDetails.isCredit ? '#16a34a' : '#dc2626'}; font-weight: bold;">${txnDetails.isCredit ? '+' : '-'}${formattedAmount}</td></tr>
        <tr><td>Ledger Balance</td><td><strong>${formattedBalance}</strong></td></tr>
        <tr><td>Narration</td><td>${txnDetails.narration || ''}</td></tr>
      </table>
      <p>If you did not authorize this transaction, please contact our support desk immediately.</p>
    `;
    return this.sendMail(to, `Apex Txn Alert: ${txnDetails.transactionNo}`, this._wrapTemplate(title, body));
  }

  async sendLoanApprovalEmail(to, memberName, loanDetails) {
    const title = 'Loan Application Approved';
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loanDetails.amount);
    const formattedEmi = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loanDetails.emiAmount);
    
    const body = `
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>We are pleased to inform you that your loan application has been approved.</p>
      <table class="table">
        <tr><th>Parameter</th><th>Details</th></tr>
        <tr><td>Application No</td><td><strong>${loanDetails.applicationNo}</strong></td></tr>
        <tr><td>Approved Principal</td><td><strong>${formattedAmount}</strong></td></tr>
        <tr><td>Interest Rate</td><td>${loanDetails.interestRate}% (${loanDetails.interestType})</td></tr>
        <tr><td>Tenure</td><td>${loanDetails.tenureMonths} Months</td></tr>
        <tr><td>Calculated Monthly EMI</td><td><strong>${formattedEmi}</strong></td></tr>
      </table>
      <p>Our loan operations team will reach out to you shortly to complete the disbursement formalities.</p>
    `;
    return this.sendMail(to, `Apex Loan Approved: ${loanDetails.applicationNo}`, this._wrapTemplate(title, body));
  }

  async sendLoanPaymentReceipt(to, memberName, paymentDetails) {
    const title = 'Loan EMI Repayment Received';
    const formattedPaid = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paymentDetails.paidAmount);
    const formattedOutstanding = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paymentDetails.outstandingAmount);

    const body = `
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>We have successfully received your loan installment payment.</p>
      <table class="table">
        <tr><th>Parameter</th><th>Details</th></tr>
        <tr><td>Loan Account No</td><td><strong>${paymentDetails.loanNo}</strong></td></tr>
        <tr><td>Installment No</td><td>#${paymentDetails.installmentNo}</td></tr>
        <tr><td>Amount Paid</td><td><strong>${formattedPaid}</strong></td></tr>
        <tr><td>Date Paid</td><td>${paymentDetails.paidDate}</td></tr>
        <tr><td>Outstanding Balance</td><td><strong>${formattedOutstanding}</strong></td></tr>
      </table>
      <p>Thank you for banking with us!</p>
    `;
    return this.sendMail(to, `Apex Repayment Receipt: ${paymentDetails.loanNo}`, this._wrapTemplate(title, body));
  }

  async sendMaturityReminder(to, memberName, depositDetails) {
    const title = 'Deposit Maturity Alert';
    const formattedPrincipal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(depositDetails.principalAmount);
    const formattedMaturity = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(depositDetails.maturityAmount);

    const body = `
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>This is to remind you that your deposit account <strong>${depositDetails.accountNo}</strong> is approaching its maturity date.</p>
      <table class="table">
        <tr><th>Parameter</th><th>Details</th></tr>
        <tr><td>Deposit Account</td><td><strong>${depositDetails.accountNo}</strong></td></tr>
        <tr><td>Deposit Type</td><td>${depositDetails.depositType.toUpperCase()}</td></tr>
        <tr><td>Principal Invested</td><td>${formattedPrincipal}</td></tr>
        <tr><td>Maturity Date</td><td><strong>${depositDetails.maturityDate}</strong></td></tr>
        <tr><td>Estimated Maturity Value</td><td style="color: #4f46e5; font-weight: bold;">${formattedMaturity}</td></tr>
      </table>
      <p>Your maturity proceeds will be processed on the maturity date. Please contact the branch to submit rollover or liquidation instructions.</p>
    `;
    return this.sendMail(to, `Apex Maturity Alert: ${depositDetails.accountNo}`, this._wrapTemplate(title, body));
  }

  async sendAccountStatementEmail(to, memberName, statementDetails) {
    const title = 'Digital Statement Available';
    const body = `
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>Your digital account statement for account <strong>${statementDetails.accountId}</strong> has been generated successfully.</p>
      <p>You can access and download your statement using the following link:</p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${statementDetails.statementUrl}" class="button">Download Statement (PDF)</a>
      </div>
      <p>Alternatively, copy and paste this URL into your browser:</p>
      <p style="font-size: 11px; word-break: break-all; color: #64748b;"><a href="${statementDetails.statementUrl}">${statementDetails.statementUrl}</a></p>
    `;
    return this.sendMail(to, `Apex Statement: ${statementDetails.accountId}`, this._wrapTemplate(title, body));
  }
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;
export { emailServiceInstance as EmailServiceInstance };
