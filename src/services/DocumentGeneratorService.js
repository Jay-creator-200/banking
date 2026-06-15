import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import uploadService from './UploadService.js';
import StatementServiceInstance from './StatementService.js';
import SavingsAccount from '../models/SavingsAccount.js';
import Loan from '../models/Loan.js';
import LoanSchedule from '../models/LoanSchedule.js';
import FDAccount from '../models/FDAccount.js';
import RDAccount from '../models/RDAccount.js';
import Member from '../models/Member.js';
import DigitalStatement from '../models/DigitalStatement.js';
import auditLogService from './AuditLogService.js';
import mongoose from 'mongoose';

export class DocumentGeneratorService {
  async generateSavingsStatement(options) {
    const { accountId, startDate, endDate, format } = options;

    const account = await SavingsAccount.findById(accountId);
    if (!account) throw new Error('Savings account not found');

    const member = await Member.findById(account.memberId);
    if (!member) throw new Error('Member not found');

    // Retrieve transactions statement payload
    const statementData = await StatementServiceInstance.getStatement(accountId, { startDate, endDate });

    const fileName = `Savings_Statement_${account.accountNo}_${Date.now()}.${format}`;
    let fileBuffer;

    if (format === 'pdf') {
      fileBuffer = await this._renderSavingsPDF(member, account, statementData);
    } else {
      fileBuffer = await this._renderSavingsExcel(member, account, statementData);
    }

    // Upload to Cloudinary
    const uploadRes = await uploadService.uploadFile(fileBuffer, {
      folder: 'banking/statements',
      resource_type: 'raw',
      public_id: `statement_${account.accountNo}_${Date.now()}`,
    });

    const digitalStatement = await DigitalStatement.create({
      memberId: member._id,
      accountType: 'savings',
      accountId: account.accountNo,
      documentType: 'statement',
      format,
      fileName,
      cloudinaryUrl: uploadRes.url,
      generatedAt: new Date(),
    });

    try {
      await auditLogService.log({
        userId: 'SYSTEM',
        action: 'STATEMENT_GENERATED',
        module: 'COMMUNICATIONS',
        entityId: digitalStatement._id.toString(),
        description: `Generated Savings Statement (${format.toUpperCase()}) for account ${account.accountNo}`,
      });
    } catch (e) {}

    return digitalStatement;
  }

  async generateLoanStatement(options) {
    const { loanId, format } = options;

    const loan = await Loan.findById(loanId);
    if (!loan) throw new Error('Loan account not found');

    const member = await Member.findById(loan.memberId);
    if (!member) throw new Error('Member not found');

    const schedules = await LoanSchedule.find({ loanId: loan._id }).sort({ installmentNo: 1 });

    const fileName = `Loan_Statement_${loan.loanNo}_${Date.now()}.${format}`;
    let fileBuffer;

    if (format === 'pdf') {
      fileBuffer = await this._renderLoanPDF(member, loan, schedules);
    } else {
      fileBuffer = await this._renderLoanExcel(member, loan, schedules);
    }

    const uploadRes = await uploadService.uploadFile(fileBuffer, {
      folder: 'banking/statements',
      resource_type: 'raw',
      public_id: `statement_loan_${loan.loanNo}_${Date.now()}`,
    });

    const digitalStatement = await DigitalStatement.create({
      memberId: member._id,
      accountType: 'loan',
      accountId: loan.loanNo,
      documentType: 'statement',
      format,
      fileName,
      cloudinaryUrl: uploadRes.url,
      generatedAt: new Date(),
    });

    try {
      await auditLogService.log({
        userId: 'SYSTEM',
        action: 'STATEMENT_GENERATED',
        module: 'COMMUNICATIONS',
        entityId: digitalStatement._id.toString(),
        description: `Generated Loan Repayment Statement (${format.toUpperCase()}) for loan ${loan.loanNo}`,
      });
    } catch (e) {}

    return digitalStatement;
  }

  async generateDepositCertificate(options) {
    const { depositId, depositType } = options;

    let account;
    let title = '';
    let accountNo = '';
    let principal = 0;
    let maturity = 0;

    if (depositType === 'fd') {
      account = await FDAccount.findById(depositId).populate('schemeId');
      title = 'Fixed Deposit Certificate';
      accountNo = account?.fdAccountNo;
      principal = account?.principalAmount;
      maturity = account?.maturityAmount;
    } else if (depositType === 'rd') {
      account = await RDAccount.findById(depositId).populate('schemeId');
      title = 'Recurring Deposit Certificate';
      accountNo = account?.rdAccountNo;
      principal = account?.monthlyInstallment;
      maturity = account?.maturityAmount;
    } else {
      throw new Error('Unsupported deposit type for certificate');
    }

    if (!account) throw new Error(`${depositType.toUpperCase()} account not found`);

    const member = await Member.findById(account.memberId);
    if (!member) throw new Error('Member not found');

    const fileName = `${depositType.toUpperCase()}_Certificate_${accountNo}_${Date.now()}.pdf`;
    
    // Certificates are always generated in PDF format
    const fileBuffer = await this._renderCertificatePDF(member, account, title, accountNo, principal, maturity, depositType);

    const uploadRes = await uploadService.uploadFile(fileBuffer, {
      folder: 'banking/certificates',
      resource_type: 'raw',
      public_id: `certificate_${accountNo}_${Date.now()}`,
    });

    const digitalStatement = await DigitalStatement.create({
      memberId: member._id,
      accountType: depositType,
      accountId: accountNo,
      documentType: 'certificate',
      format: 'pdf',
      fileName,
      cloudinaryUrl: uploadRes.url,
      generatedAt: new Date(),
    });

    try {
      await auditLogService.log({
        userId: 'SYSTEM',
        action: 'STATEMENT_GENERATED',
        module: 'COMMUNICATIONS',
        entityId: digitalStatement._id.toString(),
        description: `Generated ${depositType.toUpperCase()} Certificate for account ${accountNo}`,
      });
    } catch (e) {}

    return digitalStatement;
  }

  // --- PDF Generators ---

  _renderSavingsPDF(member, account, data) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Title & Bank Header
      doc.fillColor('#312e81').fontSize(20).text('APEX COOPERATIVE BANK', { align: 'center', bold: true });
      doc.fontSize(10).fillColor('#64748b').text('Digital Account Statement', { align: 'center' }).moveDown(2);

      // Metadata Info Box
      doc.fillColor('#1e293b').fontSize(12).text('Account Holder details:', { underline: true });
      doc.fontSize(10).text(`Name: ${member.fullName}`);
      doc.text(`Member No: ${member.memberNo}`);
      doc.text(`Mobile: ${member.mobile}`);
      doc.text(`Email: ${member.email || 'N/A'}`).moveUp(4);

      doc.text(`Account No: ${account.accountNo}`, 350);
      doc.text(`Account Type: ${account.accountType.toUpperCase()}`, 350);
      doc.text(`Interest Rate: ${account.interestRate}%`, 350);
      doc.text(`Ledger Balance: INR ${account.currentBalance.toFixed(2)}`, 350).moveDown(4);

      // Statement parameters
      doc.x = 50;
      doc.fillColor('#1e293b').fontSize(11).text(`Opening Balance: INR ${data.openingBalance.toFixed(2)}`);
      doc.text(`Closing Balance: INR ${data.closingBalance.toFixed(2)}`).moveDown(1);

      // Transaction Table Header
      const tableTop = 230;
      doc.font('Helvetica-Bold');
      doc.fontSize(9).text('Date', 50, tableTop);
      doc.text('Transaction No', 120, tableTop);
      doc.text('Narration', 220, tableTop);
      doc.text('Debit', 370, tableTop);
      doc.text('Credit', 440, tableTop);
      doc.text('Balance', 510, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica');

      let y = tableTop + 25;
      data.rows.forEach((row) => {
        const dateStr = new Date(row.date).toLocaleDateString('en-IN');
        doc.fontSize(8).text(dateStr, 50, y);
        doc.text(row.transactionNo, 120, y);
        doc.text(row.narration.substring(0, 32), 220, y);
        doc.text(row.debit > 0 ? row.debit.toFixed(2) : '0.00', 370, y);
        doc.text(row.credit > 0 ? row.credit.toFixed(2) : '0.00', 440, y);
        doc.text(row.balance.toFixed(2), 510, y);
        y += 20;

        // Auto page break check
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      });

      doc.end();
    });
  }

  _renderLoanPDF(member, loan, schedules) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fillColor('#312e81').fontSize(18).text('APEX COOPERATIVE BANK', { align: 'center' });
      doc.fontSize(10).fillColor('#64748b').text('Loan Account Repayment Statement', { align: 'center' }).moveDown(2);

      doc.fillColor('#1e293b').fontSize(12).text('Borrower Details:', { underline: true });
      doc.fontSize(10).text(`Name: ${member.fullName}`);
      doc.text(`Member No: ${member.memberNo}`);
      doc.text(`Loan Account No: ${loan.loanNo}`);
      doc.text(`Status: ${loan.loanStatus.toUpperCase()}`).moveUp(4);

      doc.text(`Approved Principal: INR ${loan.principalAmount.toFixed(2)}`, 350);
      doc.text(`EMI Amount: INR ${loan.emiAmount.toFixed(2)}/mo`, 350);
      doc.text(`Outstanding Principal: INR ${loan.outstandingPrincipal.toFixed(2)}`, 350);
      doc.text(`Outstanding Interest: INR ${loan.outstandingInterest.toFixed(2)}`, 350).moveDown(4);

      doc.x = 50;
      doc.fontSize(11).text('Repayment EMI Schedule:').moveDown(0.5);

      const tableTop = 220;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Inst #', 50, tableTop);
      doc.text('Due Date', 100, tableTop);
      doc.text('Principal Due', 180, tableTop);
      doc.text('Interest Due', 270, tableTop);
      doc.text('Total Installment', 360, tableTop);
      doc.text('Paid Amount', 450, tableTop);
      doc.text('Status', 520, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica');

      let y = tableTop + 25;
      schedules.forEach((row) => {
        const dateStr = new Date(row.dueDate).toLocaleDateString('en-IN');
        doc.fontSize(8).text(`#${row.installmentNo}`, 50, y);
        doc.text(dateStr, 100, y);
        doc.text(row.principalDue.toFixed(2), 180, y);
        doc.text(row.interestDue.toFixed(2), 270, y);
        doc.text(row.totalDue.toFixed(2), 360, y);
        doc.text(row.paidAmount.toFixed(2), 450, y);
        doc.text(row.paymentStatus.toUpperCase(), 520, y);
        y += 20;

        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      });

      doc.end();
    });
  }

  _renderCertificatePDF(member, account, title, accountNo, principal, maturity, depositType) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Border lines to make it look like a Certificate
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeColor('#4f46e5').lineWidth(3).stroke();
      doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.moveDown(4);
      doc.fillColor('#312e81').fontSize(22).text('APEX COOPERATIVE BANK', { align: 'center', bold: true });
      doc.fontSize(12).fillColor('#64748b').text('Maturity Certificate & Deposit Receipt', { align: 'center' }).moveDown(3);

      doc.fillColor('#1e293b').fontSize(16).text(title, { align: 'center', bold: true }).moveDown(2);

      const xLeft = 80;
      const xRight = 320;
      let y = 230;

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Certificate Reference No:', xLeft, y);
      doc.font('Helvetica').text(`CERT-${accountNo}-${Date.now().toString().slice(-4)}`, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Member Name:', xLeft, y);
      doc.font('Helvetica').text(member.fullName, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Membership Number:', xLeft, y);
      doc.font('Helvetica').text(member.memberNo, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Account number:', xLeft, y);
      doc.font('Helvetica').text(accountNo, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Scheme details:', xLeft, y);
      doc.font('Helvetica').text(account.schemeId?.schemeName || `${depositType.toUpperCase()} Investment Scheme`, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text(depositType === 'fd' ? 'Principal Invested:' : 'Monthly Installment:', xLeft, y);
      doc.font('Helvetica').text(`INR ${principal.toFixed(2)}`, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Rate of Interest:', xLeft, y);
      doc.font('Helvetica').text(`${account.interestRate}% per annum`, xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Maturity Date:', xLeft, y);
      doc.font('Helvetica').text(new Date(account.maturityDate).toLocaleDateString('en-IN'), xRight, y);
      y += 30;

      doc.font('Helvetica-Bold').text('Estimated Maturity proceeds:', xLeft, y);
      doc.font('Helvetica').text(`INR ${maturity.toFixed(2)}`, xRight, y);
      y += 60;

      doc.fontSize(10).fillColor('#64748b').text('This document serves as an official verification of deposits received. Subject to cooperative rules.', { align: 'center', italic: true });
      
      // Signatures
      y = doc.page.height - 130;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('Authorized Signatory', 80, y);
      doc.text('Branch Manager', 420, y);
      doc.moveTo(80, y - 5).lineTo(200, y - 5).strokeColor('#94a3b8').stroke();
      doc.moveTo(420, y - 5).lineTo(520, y - 5).stroke();

      doc.end();
    });
  }

  // --- Excel Generators ---

  async _renderSavingsExcel(member, account, data) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Savings Statement');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Transaction No', key: 'transactionNo', width: 20 },
      { header: 'Narration', key: 'narration', width: 35 },
      { header: 'Payment Mode', key: 'paymentMode', width: 15 },
      { header: 'Debit (INR)', key: 'debit', width: 15 },
      { header: 'Credit (INR)', key: 'credit', width: 15 },
      { header: 'Balance (INR)', key: 'balance', width: 15 },
    ];

    // Info header rows
    sheet.insertRow(1, ['APEX COOPERATIVE BANK - SAVINGS STATEMENT']);
    sheet.insertRow(2, [`Account Holder: ${member.fullName}`, `Account No: ${account.accountNo}`]);
    sheet.insertRow(3, [`Member No: ${member.memberNo}`, `Account Type: ${account.accountType.toUpperCase()}`]);
    sheet.insertRow(4, [`Opening Balance: INR ${data.openingBalance.toFixed(2)}`, `Closing Balance: INR ${data.closingBalance.toFixed(2)}`]);
    sheet.insertRow(5, []); // Empty spacing row

    // Fill data
    data.rows.forEach((row) => {
      sheet.addRow({
        date: new Date(row.date).toLocaleDateString('en-IN'),
        transactionNo: row.transactionNo,
        narration: row.narration,
        paymentMode: row.paymentMode,
        debit: row.debit,
        credit: row.credit,
        balance: row.balance,
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  async _renderLoanExcel(member, loan, schedules) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Loan Schedule');

    sheet.columns = [
      { header: 'Installment #', key: 'installmentNo', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Opening Principal', key: 'openingPrincipal', width: 20 },
      { header: 'Principal Due', key: 'principalDue', width: 20 },
      { header: 'Interest Due', key: 'interestDue', width: 20 },
      { header: 'Total Due', key: 'totalDue', width: 20 },
      { header: 'Paid Amount', key: 'paidAmount', width: 20 },
      { header: 'Status', key: 'paymentStatus', width: 15 },
    ];

    sheet.insertRow(1, ['APEX COOPERATIVE BANK - LOAN REPAYMENT SCHEDULE']);
    sheet.insertRow(2, [`Borrower: ${member.fullName}`, `Loan No: ${loan.loanNo}`]);
    sheet.insertRow(3, [`Principal Approved: INR ${loan.principalAmount.toFixed(2)}`, `Monthly EMI: INR ${loan.emiAmount.toFixed(2)}`]);
    sheet.insertRow(4, []);

    schedules.forEach((row) => {
      sheet.addRow({
        installmentNo: row.installmentNo,
        dueDate: new Date(row.dueDate).toLocaleDateString('en-IN'),
        openingPrincipal: row.openingPrincipal,
        principalDue: row.principalDue,
        interestDue: row.interestDue,
        totalDue: row.totalDue,
        paidAmount: row.paidAmount,
        paymentStatus: row.paymentStatus.toUpperCase(),
      });
    });

    return await workbook.xlsx.writeBuffer();
  }
}

const documentGeneratorServiceInstance = new DocumentGeneratorService();
export default documentGeneratorServiceInstance;
export { documentGeneratorServiceInstance as DocumentGeneratorServiceInstance };
