import BaseService from './BaseService.js';
import rdAccountRepository from '../repositories/RDAccountRepository.js';
import fdAccountRepository from '../repositories/FDAccountRepository.js';
import ddsAccountRepository from '../repositories/DDSAccountRepository.js';
import misAccountRepository from '../repositories/MISAccountRepository.js';
import transactionService from './TransactionService.js';
import auditLogService from './AuditLogService.js';
import depositInterestService from './DepositInterestService.js';
import { depositPrematureClosureSchema } from '../schemas/deposit.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class DepositClosureService extends BaseService {
  constructor() {
    super(rdAccountRepository); // primary repo; other repos accessed directly
  }
  /**
   * Helper to retrieve repository based on account type
   */
  getRepository(accountType) {
    switch (accountType.toUpperCase()) {
      case 'RD': return rdAccountRepository;
      case 'FD': return fdAccountRepository;
      case 'DDS': return ddsAccountRepository;
      case 'MIS': return misAccountRepository;
      default: throw AppError.validation(`Invalid deposit account type: ${accountType}`);
    }
  }

  /**
   * Calculate premature closure payout details
   */
  async calculatePrematureClosure(accountId, accountType, closureDate = new Date()) {
    const repo = this.getRepository(accountType);
    const account = await repo.findById(accountId, ['schemeId', 'memberId']);
    if (!account) throw AppError.notFound(`${accountType} account not found`);

    if (['closed', 'premature_closed'].includes(account.status)) {
      throw AppError.validation(`Account is already closed.`);
    }

    const DepositScheme = mongoose.model('DepositScheme');
    const scheme = await DepositScheme.findById(account.schemeId);
    if (!scheme) throw AppError.notFound('Associated scheme not found');

    const startDate = new Date(account.startDate);
    const elapsedMs = closureDate.getTime() - startDate.getTime();
    if (elapsedMs < 0) {
      throw AppError.validation('Closure date cannot be before account start date.');
    }

    // Effective Interest Rate = Contract Rate - Penalty Rate
    const penaltyRate = scheme.prematurePenaltyRate || 0;
    const effectiveRate = Math.max(0, account.interestRate - penaltyRate);
    const effectiveRateFrac = effectiveRate / 100;

    let totalPrincipal = 0;
    let recalculatedInterest = 0;
    let interestAlreadyPaid = 0;
    let payoutAmount = 0;
    let elapsedDuration = 0;
    let elapsedUnit = 'months';

    if (accountType.toUpperCase() === 'RD') {
      // Elapsed months
      elapsedDuration = Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30.4375));
      totalPrincipal = account.totalDepositAmount;

      if (elapsedDuration >= 1) {
        // Recalculate using RD quarterly compounding with effectiveRate
        const calc = depositInterestService.calculateRD(
          account.monthlyInstallment,
          effectiveRateFrac,
          elapsedDuration
        );
        recalculatedInterest = calc.totalInterest;
      }
      payoutAmount = totalPrincipal + recalculatedInterest;
    } 
    
    else if (accountType.toUpperCase() === 'FD') {
      elapsedDuration = Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30.4375));
      totalPrincipal = account.principalAmount;

      if (elapsedDuration >= 1) {
        const calc = depositInterestService.calculateFD(
          account.principalAmount,
          effectiveRateFrac,
          elapsedDuration,
          scheme.compoundingFrequency || 'quarterly',
          scheme.interestType || 'compound'
        );
        recalculatedInterest = calc.interestAmount;
      }
      payoutAmount = totalPrincipal + recalculatedInterest;
    } 
    
    else if (accountType.toUpperCase() === 'DDS') {
      elapsedDuration = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
      elapsedUnit = 'days';
      totalPrincipal = account.totalDeposit;

      if (elapsedDuration >= 1) {
        const calc = depositInterestService.calculateDDS(
          account.dailyAmount,
          effectiveRateFrac,
          elapsedDuration
        );
        recalculatedInterest = calc.interestAmount;
      }
      payoutAmount = totalPrincipal + recalculatedInterest;
    } 
    
    else if (accountType.toUpperCase() === 'MIS') {
      elapsedDuration = Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30.4375));
      totalPrincipal = account.principalAmount;

      if (elapsedDuration >= 1) {
        // Recalculate interest for the elapsed months
        recalculatedInterest = Math.round(account.principalAmount * (effectiveRateFrac / 12) * elapsedDuration * 100) / 100;
        
        // Interest paid already
        interestAlreadyPaid = Math.round(account.monthlyInterestAmount * elapsedDuration * 100) / 100;
      }

      // Net payout amount: Principal + Recalculated Interest - Already Paid Interest
      payoutAmount = Math.round((totalPrincipal + recalculatedInterest - interestAlreadyPaid) * 100) / 100;
    }

    return {
      accountId,
      accountType,
      accountNo: account.rdAccountNo || account.fdAccountNo || account.ddsAccountNo || account.misAccountNo,
      totalPrincipal,
      contractInterestRate: account.interestRate,
      penaltyRate,
      effectiveInterestRate: effectiveRate,
      elapsedDuration,
      elapsedUnit,
      recalculatedInterest,
      interestAlreadyPaid,
      payoutAmount,
    };
  }

  /**
   * Request Premature Closure (creates Transaction Request in PENDING state)
   */
  async requestPrematureClosure(data, userId) {
    const validated = this.validate(depositPrematureClosureSchema, data);
    
    const payoutDetails = await this.calculatePrematureClosure(validated.accountId, validated.accountType);

    const paymentMode = data.paymentMode || 'CASH';
    const destSavingsAccountNo = data.fundingSavingsAccountNo || data.referenceNo || null;

    const txnType = `${validated.accountType.toUpperCase()}_WITHDRAWAL${paymentMode === 'TRANSFER' ? '_TRANSFER' : ''}`;

    // Create pending transaction request
    const transaction = await transactionService.createTransaction({
      branchId: data.branchId || (await this.getRepository(validated.accountType).findById(validated.accountId)).branchId,
      memberId: (await this.getRepository(validated.accountType).findById(validated.accountId)).memberId,
      accountType: 'scheme',
      accountId: payoutDetails.accountNo,
      transactionType: txnType,
      paymentMode,
      amount: payoutDetails.payoutAmount,
      referenceNo: destSavingsAccountNo,
      narration: `Premature Closure request: ${validated.remarks} (Effective Rate: ${payoutDetails.effectiveInterestRate}%)`,
      sourceCollection: `${validated.accountType.toUpperCase()}Account`,
      sourceId: validated.accountId,
    }, userId);

    await auditLogService.log({
      userId,
      action: 'DEPOSIT_PREMATURE_CLOSURE_REQUESTED',
      module: 'DEPOSITS',
      entityId: validated.accountId,
      description: `Requested premature closure for ${validated.accountType} account ${payoutDetails.accountNo}. Payout: ₹${payoutDetails.payoutAmount}`,
    });

    return transaction;
  }
}

const depositClosureService = new DepositClosureService();
export default depositClosureService;
export { depositClosureService as DepositClosureServiceInstance };
