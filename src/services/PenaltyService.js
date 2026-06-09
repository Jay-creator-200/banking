import BaseService from './BaseService.js';
import loanRepository from '../repositories/LoanRepository.js';
import loanScheduleRepository from '../repositories/LoanScheduleRepository.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class PenaltyService extends BaseService {
  constructor() {
    super(loanRepository);
  }

  /**
   * Calculate penalty for an overdue installment.
   *
   * @param {Object} installment - LoanSchedule document
   * @param {Object} product - LoanProduct document
   * @returns {number} Penalty amount
   */
  calculatePenalty(installment, product) {
    const today = new Date();
    const dueDate = new Date(installment.dueDate);
    if (today <= dueDate) return 0;

    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    const overdueAmount = (installment.principalDue - installment.principalPaid) + (installment.interestDue - installment.interestPaid);

    let penalty = 0;
    switch (product.penaltyType) {
      case 'daily_percentage':
        penalty = (overdueAmount * product.penaltyRate * daysOverdue) / (100 * 365);
        break;
      case 'monthly_percentage': {
        const monthsOverdue = Math.ceil(daysOverdue / 30);
        penalty = (overdueAmount * product.penaltyRate * monthsOverdue) / 100;
        break;
      }
      case 'fixed':
        penalty = product.penaltyRate;
        break;
      case 'none':
      default:
        penalty = 0;
    }

    return Math.round(penalty * 100) / 100;
  }

  /**
   * Apply penalties to all overdue installments for a loan.
   */
  async applyPenalties(loanId, userId = 'SYSTEM') {
    const LoanProduct = mongoose.model('LoanProduct');
    const loan = await loanRepository.model.findById(loanId).populate('loanProductId').exec();
    if (!loan) throw AppError.notFound('Loan not found');

    const overdueInstallments = await loanScheduleRepository.findOverdueInstallments(loanId);
    let totalPenalty = 0;

    for (const installment of overdueInstallments) {
      const penalty = this.calculatePenalty(installment, loan.loanProductId);
      if (penalty > 0) {
        const daysOverdue = Math.floor((new Date() - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24));
        const oldPenaltyDue = installment.penaltyDue || 0;
        const penaltyDelta = Math.round((penalty - oldPenaltyDue) * 100) / 100;

        if (penaltyDelta > 0) {
          await loanScheduleRepository.model.findByIdAndUpdate(installment._id, {
            $set: {
              penaltyDue: Math.round(penalty * 100) / 100,
              totalDue: Math.round((installment.totalDue + penaltyDelta) * 100) / 100,
              daysOverdue,
              updatedBy: userId,
            },
          });
          totalPenalty += penaltyDelta;
        }
      }
    }

    // Update loan's penalty accrued
    if (totalPenalty > 0) {
      await loanRepository.model.findByIdAndUpdate(loanId, {
        $inc: { penaltyAccrued: totalPenalty, overdueAmount: totalPenalty },
        $set: { updatedBy: userId },
      });
    }

    return { loanId, overdueInstallments: overdueInstallments.length, totalPenalty };
  }

  /**
   * Get overdue summary for a specific loan.
   */
  async getOverdueSummary(loanId) {
    const loan = await loanRepository.model.findById(loanId).populate('loanProductId memberId', 'fullName memberNo').exec();
    if (!loan) throw AppError.notFound('Loan not found');

    const overdueInstallments = await loanScheduleRepository.findOverdueInstallments(loanId);
    const totalOverduePrincipal = overdueInstallments.reduce((s, i) => s + (i.principalDue - i.principalPaid), 0);
    const totalOverdueInterest = overdueInstallments.reduce((s, i) => s + (i.interestDue - i.interestPaid), 0);
    const totalPenalty = overdueInstallments.reduce((s, i) => s + (i.penaltyDue - i.penaltyPaid), 0);
    const maxDaysOverdue = overdueInstallments.length > 0
      ? Math.max(...overdueInstallments.map((i) => i.daysOverdue || 0))
      : 0;

    return {
      loan: {
        loanNo: loan.loanNo,
        member: loan.memberId,
        outstandingPrincipal: loan.outstandingPrincipal,
        overdueAmount: loan.overdueAmount,
      },
      overdueInstallments: overdueInstallments.length,
      totalOverduePrincipal: Math.round(totalOverduePrincipal * 100) / 100,
      totalOverdueInterest: Math.round(totalOverdueInterest * 100) / 100,
      totalPenalty: Math.round(totalPenalty * 100) / 100,
      maxDaysOverdue,
    };
  }
}

const penaltyService = new PenaltyService();
export default penaltyService;
export { penaltyService as PenaltyServiceInstance };
