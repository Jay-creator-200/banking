import BaseService from './BaseService.js';
import mongoose from 'mongoose';

export class DepositInterestService {
  /**
   * Calculate RD maturity details using quarterly compounding
   */
  calculateRD(monthlyInstallment, annualRate, tenureMonths) {
    let balance = 0;
    let totalPrincipal = 0;
    const monthlyRate = annualRate / 12;
    let interestEarned = 0;

    for (let m = 1; m <= tenureMonths; m++) {
      balance += monthlyInstallment;
      totalPrincipal += monthlyInstallment;
      
      const monthlyInterest = balance * monthlyRate;
      interestEarned += monthlyInterest;

      // Compound quarterly (credit interest to principal every 3 months)
      if (m % 3 === 0) {
        balance += interestEarned;
        interestEarned = 0;
      }
    }
    balance += interestEarned; // credit remaining interest

    const maturityAmount = Math.round(balance * 100) / 100;
    const totalInterest = Math.round((maturityAmount - totalPrincipal) * 100) / 100;

    return {
      totalDeposit: totalPrincipal,
      totalInterest,
      maturityAmount,
    };
  }

  /**
   * Calculate FD maturity details
   */
  calculateFD(principal, annualRate, tenureMonths, compoundingFrequency = 'quarterly', interestType = 'compound') {
    const t = tenureMonths / 12;
    if (interestType === 'simple') {
      const interestAmount = Math.round(principal * annualRate * t * 100) / 100;
      const maturityAmount = Math.round((principal + interestAmount) * 100) / 100;
      return {
        totalDeposit: principal,
        interestAmount,
        maturityAmount,
      };
    } else {
      let f = 4; // quarterly
      if (compoundingFrequency === 'monthly') f = 12;
      if (compoundingFrequency === 'yearly') f = 1;

      const maturityAmount = Math.round(principal * Math.pow(1 + (annualRate / f), f * t) * 100) / 100;
      const interestAmount = Math.round((maturityAmount - principal) * 100) / 100;

      return {
        totalDeposit: principal,
        interestAmount,
        maturityAmount,
      };
    }
  }

  /**
   * Calculate DDS maturity details
   */
  calculateDDS(dailyAmount, annualRate, durationDays) {
    const totalDeposit = dailyAmount * durationDays;
    // Simple interest based on average daily product balance
    const interestAmount = Math.round((totalDeposit / 2) * annualRate * (durationDays / 365) * 100) / 100;
    const maturityAmount = Math.round((totalDeposit + interestAmount) * 100) / 100;

    return {
      totalDeposit,
      interestAmount,
      maturityAmount,
    };
  }

  /**
   * Calculate MIS payout details
   */
  calculateMIS(principal, annualRate) {
    const monthlyInterestAmount = Math.round((principal * (annualRate / 12)) * 100) / 100;
    return {
      principalAmount: principal,
      monthlyInterestAmount,
      maturityAmount: principal,
    };
  }

  /**
   * Unified route interface for estimations
   */
  calculateMaturity(data) {
    const rate = parseFloat(data.interestRate) / 100;
    switch (data.schemeType.toUpperCase()) {
      case 'RD':
        return this.calculateRD(parseFloat(data.monthlyInstallment), rate, parseInt(data.tenureMonths, 10));
      case 'FD':
        return this.calculateFD(
          parseFloat(data.principalAmount),
          rate,
          parseInt(data.tenureMonths, 10),
          data.compoundingFrequency,
          data.interestType
        );
      case 'DDS':
        return this.calculateDDS(parseFloat(data.dailyAmount), rate, parseInt(data.durationDays, 10));
      case 'MIS':
        return this.calculateMIS(parseFloat(data.principalAmount), rate);
      default:
        throw new Error('Unsupported scheme type');
    }
  }

  /**
   * Generate installment schedule for RD account
   */
  async generateRDInstallmentSchedule(rdAccount, session = null) {
    const RDInstallment = mongoose.model('RDInstallment');
    const scheduleItems = [];
    const baseDate = new Date(rdAccount.startDate);

    for (let i = 1; i <= rdAccount.tenureMonths; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      scheduleItems.push({
        rdAccountId: rdAccount._id,
        installmentNo: i,
        dueDate,
        amount: rdAccount.monthlyInstallment,
        paidAmount: 0,
        paidDate: null,
        status: 'pending',
      });
    }

    return RDInstallment.insertMany(scheduleItems, { session });
  }
}

const depositInterestService = new DepositInterestService();
export default depositInterestService;
export { depositInterestService as DepositInterestServiceInstance };
