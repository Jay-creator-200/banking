import BaseService from './BaseService.js';
import loanRepository from '../repositories/LoanRepository.js';
import loanPaymentRepository from '../repositories/LoanPaymentRepository.js';
import loanScheduleRepository from '../repositories/LoanScheduleRepository.js';
import loanApplicationRepository from '../repositories/LoanApplicationRepository.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LoanReportService extends BaseService {
  constructor() {
    super(loanRepository);
  }

  /** Loan Register — all loans with summary */
  async getLoanRegister(branchId, startDate, endDate) {
    const filter = { isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);
    if (startDate && endDate) {
      filter.disbursementDate = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }
    const loans = await loanRepository.model
      .find(filter)
      .populate('memberId', 'fullName memberNo mobile')
      .populate('branchId', 'branchName branchCode')
      .populate('loanProductId', 'productName productCode')
      .sort('-disbursementDate')
      .lean()
      .exec();

    const summary = {
      totalLoans: loans.length,
      totalDisbursed: loans.reduce((s, l) => s + l.principalAmount, 0),
      totalOutstanding: loans.reduce((s, l) => s + l.outstandingPrincipal, 0),
      activeCount: loans.filter((l) => l.loanStatus === 'active').length,
      overdueCount: loans.filter((l) => l.loanStatus === 'overdue').length,
      closedCount: loans.filter((l) => l.loanStatus === 'closed').length,
    };

    return { loans, summary };
  }

  /** Disbursement Report */
  async getDisbursementReport(branchId, startDate, endDate) {
    const filter = { isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);
    if (startDate && endDate) {
      filter.disbursementDate = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }
    return loanRepository.model
      .find(filter)
      .populate('memberId', 'fullName memberNo')
      .populate('loanProductId', 'productName')
      .populate('branchId', 'branchName')
      .sort('-disbursementDate')
      .lean()
      .exec();
  }

  /** EMI Collection Report */
  async getCollectionReport(branchId, startDate, endDate) {
    const filter = { isDeleted: false };
    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }
    const payments = await loanPaymentRepository.model
      .find(filter)
      .populate({ path: 'loanId', populate: [{ path: 'memberId', select: 'fullName memberNo' }, { path: 'branchId', select: 'branchName' }] })
      .sort('-paymentDate')
      .lean()
      .exec();

    const filteredPayments = branchId
      ? payments.filter((p) => p.loanId?.branchId?._id?.toString() === branchId)
      : payments;

    const summary = {
      totalCollected: filteredPayments.reduce((s, p) => s + p.amount, 0),
      principalCollected: filteredPayments.reduce((s, p) => s + p.principalCollected, 0),
      interestCollected: filteredPayments.reduce((s, p) => s + p.interestCollected, 0),
      penaltyCollected: filteredPayments.reduce((s, p) => s + p.penaltyCollected, 0),
      count: filteredPayments.length,
    };

    return { payments: filteredPayments, summary };
  }

  /** Overdue Report */
  async getOverdueReport(branchId) {
    const filter = { loanStatus: { $in: ['overdue'] }, isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);

    const loans = await loanRepository.model
      .find(filter)
      .populate('memberId', 'fullName memberNo mobile')
      .populate('branchId', 'branchName')
      .populate('loanProductId', 'productName')
      .lean()
      .exec();

    // For each overdue loan, get overdue installment count
    const result = await Promise.all(
      loans.map(async (l) => {
        const overdueSchedules = await loanScheduleRepository.model
          .find({ loanId: l._id, paymentStatus: 'overdue', isDeleted: false })
          .sort('installmentNo')
          .lean()
          .exec();
        const maxDaysOverdue = overdueSchedules.length > 0
          ? Math.max(...overdueSchedules.map((s) => s.daysOverdue || 0))
          : 0;
        return { ...l, overdueInstallments: overdueSchedules.length, maxDaysOverdue };
      })
    );

    return {
      loans: result,
      summary: {
        totalLoans: result.length,
        totalOverdueAmount: result.reduce((s, l) => s + (l.overdueAmount || 0), 0),
        totalOutstandingPrincipal: result.reduce((s, l) => s + l.outstandingPrincipal, 0),
      },
    };
  }

  /** Product-wise Loan Summary */
  async getProductWiseReport(branchId) {
    const match = { isDeleted: false };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const result = await loanRepository.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$loanProductId',
          totalLoans: { $sum: 1 },
          totalDisbursed: { $sum: '$principalAmount' },
          totalOutstanding: { $sum: '$outstandingPrincipal' },
          activeCount: { $sum: { $cond: [{ $eq: ['$loanStatus', 'active'] }, 1, 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ['$loanStatus', 'overdue'] }, 1, 0] } },
          closedCount: { $sum: { $cond: [{ $eq: ['$loanStatus', 'closed'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'loanproducts', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $sort: { totalLoans: -1 } },
    ]);

    return result.map((r) => ({
      product: r.product.productName,
      productCode: r.product.productCode,
      totalLoans: r.totalLoans,
      totalDisbursed: r.totalDisbursed,
      totalOutstanding: r.totalOutstanding,
      activeCount: r.activeCount,
      overdueCount: r.overdueCount,
      closedCount: r.closedCount,
    }));
  }

  /** Branch-wise Loan Summary */
  async getBranchWiseReport() {
    const result = await loanRepository.model.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$branchId',
          totalLoans: { $sum: 1 },
          totalDisbursed: { $sum: '$principalAmount' },
          totalOutstanding: { $sum: '$outstandingPrincipal' },
          overdueCount: { $sum: { $cond: [{ $eq: ['$loanStatus', 'overdue'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: '$branch' },
      { $sort: { totalLoans: -1 } },
    ]);

    return result.map((r) => ({
      branch: r.branch.branchName,
      branchCode: r.branch.branchCode,
      totalLoans: r.totalLoans,
      totalDisbursed: r.totalDisbursed,
      totalOutstanding: r.totalOutstanding,
      overdueCount: r.overdueCount,
    }));
  }
}

const loanReportService = new LoanReportService();
export default loanReportService;
export { loanReportService as LoanReportServiceInstance };
