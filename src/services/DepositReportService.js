import BaseService from './BaseService.js';
import rdAccountRepository from '../repositories/RDAccountRepository.js';
import fdAccountRepository from '../repositories/FDAccountRepository.js';
import ddsAccountRepository from '../repositories/DDSAccountRepository.js';
import misAccountRepository from '../repositories/MISAccountRepository.js';
import mongoose from 'mongoose';

export class DepositReportService {
  /**
   * Get summarized dashboard stats for deposits
   */
  async getSummary(branchId = null) {
    const filter = { isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);

    // 1. RD Stats
    const rdStats = await rdAccountRepository.model.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDeposit: { $sum: '$totalDepositAmount' },
          avgRate: { $avg: '$interestRate' },
        },
      },
    ]);

    // 2. FD Stats
    const fdStats = await fdAccountRepository.model.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPrincipal: { $sum: '$principalAmount' },
          avgRate: { $avg: '$interestRate' },
        },
      },
    ]);

    // 3. DDS Stats
    const ddsStats = await ddsAccountRepository.model.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDeposit: { $sum: '$totalDeposit' },
          avgRate: { $avg: '$interestRate' },
        },
      },
    ]);

    // 4. MIS Stats
    const misStats = await misAccountRepository.model.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPrincipal: { $sum: '$principalAmount' },
          avgRate: { $avg: '$interestRate' },
        },
      },
    ]);

    // Format results nicely
    const formatStats = (stats, isPrincipalField = false) => {
      const result = {
        active: { count: 0, balance: 0 },
        matured: { count: 0, balance: 0 },
        closed: { count: 0, balance: 0 },
        totalCount: 0,
        totalBalance: 0,
        avgRate: 0,
      };

      let rateSum = 0;
      let rateCount = 0;

      stats.forEach((item) => {
        const status = item._id || 'active';
        const bal = isPrincipalField ? item.totalPrincipal : item.totalDeposit;
        if (result[status]) {
          result[status].count = item.count;
          result[status].balance = bal;
        }
        result.totalCount += item.count;
        result.totalBalance += bal;
        
        if (item.avgRate) {
          rateSum += item.avgRate * item.count;
          rateCount += item.count;
        }
      });

      result.avgRate = rateCount > 0 ? Math.round((rateSum / rateCount) * 100) / 100 : 0;
      return result;
    };

    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const maturingFilter = { ...filter, maturityDate: { $gte: now, $lte: monthEnd } };

    const [rdMat, fdMat, ddsMat, misMat] = await Promise.all([
      rdAccountRepository.model.countDocuments({ ...maturingFilter }),
      fdAccountRepository.model.countDocuments({ ...maturingFilter }),
      ddsAccountRepository.model.countDocuments({ ...maturingFilter }),
      misAccountRepository.model.countDocuments({ ...maturingFilter }),
    ]);

    const rdFormatted = formatStats(rdStats);
    const fdFormatted = formatStats(fdStats, true);
    const ddsFormatted = formatStats(ddsStats);
    const misFormatted = formatStats(misStats, true);

    const misMonthly = await misAccountRepository.model.aggregate([
      { $match: { ...filter, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$monthlyInterestAmount' } } },
    ]);

    const totalPortfolio =
      (rdFormatted.active?.balance || 0) +
      (fdFormatted.active?.balance || 0) +
      (ddsFormatted.active?.balance || 0) +
      (misFormatted.active?.balance || 0);

    const totalActiveAccounts =
      (rdFormatted.active?.count || 0) +
      (fdFormatted.active?.count || 0) +
      (ddsFormatted.active?.count || 0) +
      (misFormatted.active?.count || 0);

    return {
      totalPortfolio,
      totalActiveAccounts,
      monthlyInterestObligation: misMonthly[0]?.total || 0,
      maturingThisMonth: rdMat + fdMat + ddsMat + misMat,
      rd: {
        activeCount: rdFormatted.active?.count || 0,
        maturedCount: rdFormatted.matured?.count || 0,
        closedCount: rdFormatted.closed?.count || 0,
        totalPortfolio: rdFormatted.totalBalance || 0,
      },
      fd: {
        activeCount: fdFormatted.active?.count || 0,
        maturedCount: fdFormatted.matured?.count || 0,
        closedCount: fdFormatted.closed?.count || 0,
        totalPortfolio: fdFormatted.totalBalance || 0,
      },
      dds: {
        activeCount: ddsFormatted.active?.count || 0,
        maturedCount: ddsFormatted.matured?.count || 0,
        closedCount: ddsFormatted.closed?.count || 0,
        totalPortfolio: ddsFormatted.totalBalance || 0,
      },
      mis: {
        activeCount: misFormatted.active?.count || 0,
        maturedCount: misFormatted.matured?.count || 0,
        closedCount: misFormatted.closed?.count || 0,
        totalPortfolio: misFormatted.totalBalance || 0,
      },
      RD: rdFormatted,
      FD: fdFormatted,
      DDS: ddsFormatted,
      MIS: misFormatted,
    };
  }

  /**
   * Get active accounts list
   */
  async getActiveAccounts(accountType, branchId = null) {
    const filter = { status: 'active', isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);

    const repo = (() => {
      switch (accountType.toUpperCase()) {
        case 'RD': return rdAccountRepository;
        case 'FD': return fdAccountRepository;
        case 'DDS': return ddsAccountRepository;
        case 'MIS': return misAccountRepository;
        default: return null;
      }
    })();

    if (!repo) return [];

    return repo.model
      .find(filter)
      .populate('memberId', 'memberNo firstName lastName fullName')
      .populate('schemeId', 'schemeName schemeCode schemeType')
      .exec();
  }

  /**
   * Get all active accounts across all deposit types, normalized for reporting
   */
  async getAllActiveAccounts(branchId = null) {
    const filter = { isDeleted: false };
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);

    const [rdAccts, fdAccts, ddsAccts, misAccts] = await Promise.all([
      rdAccountRepository.model.find({ ...filter }).populate('memberId', 'fullName memberNo').populate('schemeId', 'schemeName').lean(),
      fdAccountRepository.model.find({ ...filter }).populate('memberId', 'fullName memberNo').populate('schemeId', 'schemeName').lean(),
      ddsAccountRepository.model.find({ ...filter }).populate('memberId', 'fullName memberNo').populate('schemeId', 'schemeName').lean(),
      misAccountRepository.model.find({ ...filter }).populate('memberId', 'fullName memberNo').populate('schemeId', 'schemeName').lean(),
    ]);

    const normalize = (accts, type, accountNoField, principalField) =>
      accts.map(a => ({
        _id: a._id,
        accountNo: a[accountNoField],
        schemeType: type,
        memberName: a.memberId?.fullName || a.memberId?.firstName || 'N/A',
        memberNo: a.memberId?.memberNo || '',
        principalOrDailyAmount: a[principalField] || 0,
        interestRate: a.interestRate || 0,
        maturityAmount: a.maturityAmount || 0,
        maturityDate: a.maturityDate,
        status: a.status,
        schemeName: a.schemeId?.schemeName || '',
      }));

    return [
      ...normalize(rdAccts, 'RD', 'rdAccountNo', 'monthlyInstallment'),
      ...normalize(fdAccts, 'FD', 'fdAccountNo', 'principalAmount'),
      ...normalize(ddsAccts, 'DDS', 'ddsAccountNo', 'dailyAmount'),
      ...normalize(misAccts, 'MIS', 'misAccountNo', 'principalAmount'),
    ].sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate));
  }
}

const depositReportService = new DepositReportService();
export default depositReportService;
export { depositReportService as DepositReportServiceInstance };
