import BaseService from './BaseService.js';
import loanScheduleRepository from '../repositories/LoanScheduleRepository.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class LoanScheduleService extends BaseService {
  constructor() {
    super(loanScheduleRepository);
  }

  /**
   * Calculate EMI using flat interest method.
   * Total Interest = P × R × N / 100
   * EMI = (P + Total Interest) / N
   */
  calculateFlatEMI(principal, annualRate, tenureMonths) {
    const totalInterest = (principal * annualRate * (tenureMonths / 12)) / 100;
    const emi = (principal + totalInterest) / tenureMonths;
    return {
      emi: Math.round(emi * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round((principal + totalInterest) * 100) / 100,
    };
  }

  /**
   * Calculate EMI using reducing balance method.
   * EMI = P × R × (1+R)^N / ((1+R)^N - 1)  where R = monthly rate
   */
  calculateReducingEMI(principal, annualRate, tenureMonths) {
    const monthlyRate = annualRate / (12 * 100);
    let emi;
    if (monthlyRate === 0) {
      emi = principal / tenureMonths;
    } else {
      const factor = Math.pow(1 + monthlyRate, tenureMonths);
      emi = (principal * monthlyRate * factor) / (factor - 1);
    }
    const totalPayable = emi * tenureMonths;
    const totalInterest = totalPayable - principal;
    return {
      emi: Math.round(emi * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
    };
  }

  /**
   * Generate the full repayment schedule.
   * Stores each installment row in loan_schedules collection.
   *
   * @param {Object} loan - The Loan document
   * @param {import('mongoose').ClientSession} [session] - DB Session
   * @returns {Promise<Array>} Schedule documents
   */
  async generateSchedule(loan, session = null) {
    try {
      const { _id: loanId, principalAmount, interestRate, interestType, tenureMonths, disbursementDate } = loan;

      const schedule = [];
      const monthlyRate = interestRate / (12 * 100);
      let balance = principalAmount;

      // Compute EMI once
      const { emi } = interestType === 'flat'
        ? this.calculateFlatEMI(principalAmount, interestRate, tenureMonths)
        : this.calculateReducingEMI(principalAmount, interestRate, tenureMonths);

      // For flat: fixed interest per period
      const flatInterestPerPeriod = interestType === 'flat'
        ? Math.round(((principalAmount * interestRate * (tenureMonths / 12)) / 100 / tenureMonths) * 100) / 100
        : 0;

      for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date(disbursementDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        let interestDue, principalDue, closingPrincipal;

        if (interestType === 'flat') {
          interestDue = flatInterestPerPeriod;
          principalDue = Math.round((principalAmount / tenureMonths) * 100) / 100;
        } else {
          // Reducing balance
          interestDue = Math.round(balance * monthlyRate * 100) / 100;
          principalDue = Math.round((emi - interestDue) * 100) / 100;
        }

        // Handle last installment rounding
        if (i === tenureMonths) {
          principalDue = Math.round(balance * 100) / 100;
        }

        closingPrincipal = Math.max(0, Math.round((balance - principalDue) * 100) / 100);
        const totalDue = Math.round((principalDue + interestDue) * 100) / 100;

        schedule.push({
          loanId,
          installmentNo: i,
          dueDate,
          openingPrincipal: Math.round(balance * 100) / 100,
          principalDue,
          interestDue,
          penaltyDue: 0,
          totalDue,
          closingPrincipal,
          paidAmount: 0,
          principalPaid: 0,
          interestPaid: 0,
          penaltyPaid: 0,
          paymentStatus: 'pending',
          createdBy: loan.createdBy || 'SYSTEM',
          updatedBy: loan.updatedBy || 'SYSTEM',
        });

        balance = closingPrincipal;
      }

      // Bulk insert
      const docs = await loanScheduleRepository.model.insertMany(schedule, { session });
      return docs;
    } catch (error) {
      this.handleError(error, 'Failed to generate loan schedule');
    }
  }

  /**
   * Get full repayment schedule for a loan.
   */
  async getSchedule(loanId) {
    return loanScheduleRepository.findByLoan(loanId);
  }

  /**
   * Get next pending installment.
   */
  async getNextDue(loanId) {
    return loanScheduleRepository.findNextDue(loanId);
  }

  /**
   * Update an installment after payment (partial or full).
   */
  async applyPayment(scheduleId, { principalPaid, interestPaid, penaltyPaid }, session = null) {
    const schedule = await loanScheduleRepository.findById(scheduleId);
    if (!schedule) throw AppError.notFound('Schedule installment not found');

    schedule.principalPaid = Math.round((schedule.principalPaid + principalPaid) * 100) / 100;
    schedule.interestPaid = Math.round((schedule.interestPaid + interestPaid) * 100) / 100;
    schedule.penaltyPaid = Math.round((schedule.penaltyPaid + penaltyPaid) * 100) / 100;
    schedule.paidAmount = Math.round((schedule.principalPaid + schedule.interestPaid + schedule.penaltyPaid) * 100) / 100;

    const totalRequired = schedule.principalDue + schedule.interestDue + schedule.penaltyDue;
    if (schedule.paidAmount >= totalRequired) {
      schedule.paymentStatus = 'paid';
      schedule.paidDate = new Date();
    } else if (schedule.paidAmount > 0) {
      schedule.paymentStatus = 'partial';
    }

    return schedule.save({ session });
  }

  /**
   * Mark overdue installments (call daily or on demand).
   */
  async markOverdueInstallments(loanId, session = null) {
    const now = new Date();
    await loanScheduleRepository.model.updateMany(
      { loanId, paymentStatus: { $in: ['pending', 'partial'] }, dueDate: { $lt: now }, isDeleted: false },
      { $set: { paymentStatus: 'overdue', updatedBy: 'SYSTEM' } },
      { session }
    );
  }
}

const loanScheduleService = new LoanScheduleService();
export default loanScheduleService;
export { loanScheduleService as LoanScheduleServiceInstance };
