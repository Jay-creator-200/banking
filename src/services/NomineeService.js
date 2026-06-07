import BaseService from './BaseService.js';
import nomineeRepository from '../repositories/MemberNomineeRepository.js';
import memberRepository from '../repositories/MemberRepository.js';
import { saveNomineesSchema } from '../schemas/member.schema.js';
import { AppError } from '../utils/error-handler.js';
import mongoose from 'mongoose';

export class NomineeService extends BaseService {
  constructor() {
    super(nomineeRepository);
  }

  /**
   * Save a member's nominee allocations.
   *
   * @param {string} memberId - Member ID.
   * @param {Array<Object>} nomineesData - Nominees payload.
   * @param {string} userId - Operating User ID.
   * @returns {Promise<Array<import('mongoose').Document>>} Updated nominee docs.
   */
  async saveNominees(memberId, nomineesData, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const member = await memberRepository.findById(memberId);
      if (!member) {
        throw AppError.notFound('Member not found');
      }

      // Validate schema
      const validatedData = this.validate(saveNomineesSchema, nomineesData);

      // Perform validation checks if nominees are specified
      if (validatedData.length > 0) {
        const hasPrimary = validatedData.some((n) => n.isPrimary);
        if (!hasPrimary) {
          throw AppError.validation('Primary nominee is required. At least one nominee must be marked as primary.');
        }

        const totalPercentage = validatedData.reduce((sum, n) => sum + n.sharePercentage, 0);
        if (totalPercentage !== 100) {
          throw AppError.validation(`Total nominee share percentage must equal exactly 100%. Current total: ${totalPercentage}%`);
        }
      }

      // Clear existing nominees
      await this.repository.model.deleteMany({ memberId }).session(session);

      // Insert new nominee lines
      let savedNominees = [];
      if (validatedData.length > 0) {
        const payload = validatedData.map((n) => ({
          ...n,
          memberId,
          createdBy: userId,
          updatedBy: userId,
        }));
        savedNominees = await this.repository.model.insertMany(payload, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return savedNominees;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleError(error, 'Failed to save nominee configurations');
    }
  }

  /**
   * Fetch nominees linked to a member.
   *
   * @param {string} memberId - Member ID.
   * @returns {Promise<Array<import('mongoose').Document>>} Nominees list.
   */
  async getNominees(memberId) {
    try {
      return await this.repository.model.find({ memberId }).exec();
    } catch (error) {
      this.handleError(error, 'Failed to fetch member nominees');
    }
  }
}

const nomineeServiceInstance = new NomineeService();
export default nomineeServiceInstance;
export { nomineeServiceInstance as NomineeServiceInstance };
