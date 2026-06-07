import BaseService from './BaseService.js';
import cashSessionRepository from '../repositories/CashSessionRepository.js';
import cashDenominationRepository from '../repositories/CashDenominationRepository.js';
import sequenceService from './SequenceService.js';
import auditLogService from './AuditLogService.js';
import { openSessionSchema, closeSessionSchema } from '../schemas/cash.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class CashSessionService extends BaseService {
  constructor() {
    super(cashSessionRepository);
  }

  /**
   * Open a new teller cash session for the current day.
   * Only one open session per teller per branch is allowed.
   *
   * @param {Object} data - Session opening payload
   * @param {string} userId - Teller User ID
   * @returns {Promise<import('mongoose').Document>} CashSession
   */
  async openSession(data, userId) {
    const validated = this.validate(openSessionSchema, data);

    // Check if an open session already exists for this teller
    const existing = await cashSessionRepository.findActiveSession(userId, validated.branchId);
    if (existing) {
      throw AppError.validation(
        `An active cash session (${existing.sessionNo}) already exists for your account. Please close it before opening a new one.`
      );
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Generate session number
      const sessionNo = await sequenceService.generateSequence('CS', validated.branchId, mongoSession);

      const sessionDate = validated.sessionDate ? new Date(validated.sessionDate) : new Date();
      sessionDate.setHours(0, 0, 0, 0);

      // Create the session
      const cashSession = await cashSessionRepository.create(
        {
          sessionNo,
          branchId: validated.branchId,
          userId,
          sessionDate,
          openingBalance: validated.openingBalance,
          systemBalance: validated.openingBalance,
          physicalBalance: validated.openingBalance,
          closingBalance: 0,
          differenceAmount: 0,
          status: 'open',
          openedAt: new Date(),
          remarks: validated.remarks,
          createdBy: userId,
          updatedBy: userId,
        },
        { session: mongoSession }
      );

      // Record opening denominations if provided
      if (validated.denominations && validated.denominations.length > 0) {
        const denomDocs = validated.denominations
          .filter((d) => d.count > 0)
          .map((d) => ({
            sessionId: cashSession._id,
            denomination: d.denomination,
            count: d.count,
            totalAmount: d.denomination * d.count,
            type: 'opening',
            createdAt: new Date(),
          }));

        if (denomDocs.length > 0) {
          await cashDenominationRepository.model.insertMany(denomDocs, { session: mongoSession });
        }
      }

      await auditLogService.logAction(
        userId,
        'TELLER',
        'OPEN_SESSION',
        'CashSession',
        cashSession._id,
        null,
        { sessionNo, openingBalance: validated.openingBalance }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return cashSession;
    } catch (error) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      this.handleError(error, 'Failed to open cash session');
    }
  }

  /**
   * Close an existing teller cash session.
   * Calculates system balance from register, records physical balance, computes difference.
   *
   * @param {Object} data - Session closing payload
   * @param {string} userId - Teller User ID
   * @returns {Promise<import('mongoose').Document>} Closed CashSession
   */
  async closeSession(data, userId) {
    const validated = this.validate(closeSessionSchema, data);

    const session = await cashSessionRepository.findById(validated.sessionId);
    if (!session) {
      throw AppError.notFound('Cash session not found');
    }
    if (session.status === 'closed') {
      throw AppError.validation('This session is already closed');
    }
    if (session.userId.toString() !== userId.toString()) {
      throw AppError.forbidden('You can only close your own teller session');
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Calculate system balance from all transactions in the session's register
      const CashTransactionRegister = mongoose.model('CashTransactionRegister');
      const registerEntries = await CashTransactionRegister.find({
        sessionId: validated.sessionId,
      }).session(mongoSession);

      let cashIn = 0;
      let cashOut = 0;
      for (const entry of registerEntries) {
        if (entry.transactionType === 'deposit' || entry.transactionType === 'receipt') {
          cashIn += entry.amount;
        } else {
          cashOut += entry.amount;
        }
      }

      const systemBalance = session.openingBalance + cashIn - cashOut;
      const differenceAmount = validated.physicalBalance - systemBalance;

      session.systemBalance = systemBalance;
      session.physicalBalance = validated.physicalBalance;
      session.closingBalance = validated.physicalBalance;
      session.differenceAmount = differenceAmount;
      session.status = 'closed';
      session.closedAt = new Date();
      session.remarks = validated.remarks || session.remarks;
      session.updatedBy = userId;
      await session.save({ session: mongoSession });

      // Record closing denominations if provided
      if (validated.denominations && validated.denominations.length > 0) {
        const denomDocs = validated.denominations
          .filter((d) => d.count > 0)
          .map((d) => ({
            sessionId: session._id,
            denomination: d.denomination,
            count: d.count,
            totalAmount: d.denomination * d.count,
            type: 'closing',
            createdAt: new Date(),
          }));

        if (denomDocs.length > 0) {
          await cashDenominationRepository.model.insertMany(denomDocs, { session: mongoSession });
        }
      }

      await auditLogService.logAction(
        userId,
        'TELLER',
        'CLOSE_SESSION',
        'CashSession',
        session._id,
        { status: 'open' },
        {
          status: 'closed',
          systemBalance,
          physicalBalance: validated.physicalBalance,
          differenceAmount,
        }
      );

      await mongoSession.commitTransaction();
      mongoSession.endSession();

      return session;
    } catch (error) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      this.handleError(error, 'Failed to close cash session');
    }
  }

  /**
   * Get active session for requesting teller (used to gate transactions).
   *
   * @param {string} userId - Teller User ID
   * @param {string} branchId - Branch ID
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async getActiveSession(userId, branchId) {
    return cashSessionRepository.findActiveSession(userId, branchId);
  }

  /**
   * Link a completed transaction to the active cash session.
   * Called by TransactionService after approving a cash transaction.
   *
   * @param {string} sessionId - Session ID
   * @param {Object} txn - Transaction document
   * @param {string} txnType - 'deposit'|'withdrawal'|'receipt'|'payment'
   * @param {import('mongoose').ClientSession} mongoSession - DB Session
   * @returns {Promise<void>}
   */
  async linkTransactionToSession(sessionId, txn, txnType, mongoSession) {
    const CashTransactionRegister = mongoose.model('CashTransactionRegister');
    await CashTransactionRegister.create(
      [
        {
          sessionId,
          transactionId: txn._id,
          transactionType: txnType,
          amount: txn.amount,
          referenceNo: txn.transactionNo,
          createdAt: new Date(),
        },
      ],
      { session: mongoSession }
    );

    // Update system balance on session
    const session = await cashSessionRepository.findById(sessionId);
    if (session && session.status === 'open') {
      if (txnType === 'deposit' || txnType === 'receipt') {
        session.systemBalance += txn.amount;
      } else {
        session.systemBalance -= txn.amount;
      }
      session.updatedBy = txn.createdBy || 'SYSTEM';
      await session.save({ session: mongoSession });
    }
  }

  /**
   * Get sessions with pagination & filters.
   *
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>}
   */
  async getSessions(filters = {}, options = {}) {
    try {
      return await this.repository.findMany(filters, {
        populate: ['userId', 'branchId'],
        sort: '-openedAt',
        ...options,
      });
    } catch (error) {
      this.handleError(error, 'Failed to retrieve cash sessions');
    }
  }

  /**
   * Get session detail by ID with denominations.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>}
   */
  async getSessionDetail(sessionId) {
    try {
      const session = await cashSessionRepository.findById(sessionId, ['userId', 'branchId']);
      if (!session) throw AppError.notFound('Cash session not found');

      const openingDenominations = await cashDenominationRepository.findBySession(sessionId, 'opening');
      const closingDenominations = await cashDenominationRepository.findBySession(sessionId, 'closing');

      const CashTransactionRegister = mongoose.model('CashTransactionRegister');
      const registerEntries = await CashTransactionRegister.find({ sessionId })
        .populate('transactionId')
        .sort('-createdAt')
        .exec();

      return {
        session,
        openingDenominations,
        closingDenominations,
        registerEntries,
      };
    } catch (error) {
      this.handleError(error, 'Failed to fetch session detail');
    }
  }
}

const cashSessionServiceInstance = new CashSessionService();
export default cashSessionServiceInstance;
export { cashSessionServiceInstance as CashSessionServiceInstance };
