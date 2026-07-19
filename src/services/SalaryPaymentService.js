import mongoose from 'mongoose';
import SalaryPayment from '../models/SalaryPayment.js';
import Expense from '../models/Expense.js';
import expenseService from './ExpenseService.js';
import sequenceService from './SequenceService.js';
import { AppError } from '../utils/error-handler.js';

export class SalaryPaymentService {
  async list(filter = {}) {
    return SalaryPayment.find(filter)
      .populate('employeeId', 'fullName employeeCode designation department monthlySalary')
      .populate('branchId', 'branchName branchCode')
      .populate('expenseId')
      .populate('voucherId')
      .sort('-paymentDate')
      .lean();
  }

  async createAndPay(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const User = mongoose.model('User');
      const Branch = mongoose.model('Branch');
      const AccountHead = mongoose.model('AccountHead');

      const employee = await User.findById(data.employeeId).populate('branchId').session(session);
      if (!employee) throw AppError.notFound('Employee not found');

      const branchId = data.branchId || employee.branchId?._id || employee.branchId;
      const branch = await Branch.findById(branchId).session(session);
      if (!branch) throw AppError.notFound('Branch not found');

      let salaryHead = await AccountHead.findOne({
        $or: [
          { code: '51003' },
          { name: { $regex: 'salary', $options: 'i' }, type: 'EXPENSE' },
        ],
        isDeleted: { $ne: true },
      }).session(session);
      if (!salaryHead) {
        const parentHead = await AccountHead.findOne({ code: '51000', type: 'EXPENSE', isDeleted: { $ne: true } }).session(session);
        salaryHead = await AccountHead.create([{
          code: '51003',
          name: 'Staff Salary Expense',
          type: 'EXPENSE',
          parentAccountId: parentHead?._id || null,
          createdBy: userId,
          updatedBy: userId,
        }], { session }).then((docs) => docs[0]);
      }

      const basicSalary = Number(data.basicSalary ?? employee.monthlySalary ?? 0);
      const allowances = Number(data.allowances || 0);
      const deductions = Number(data.deductions || 0);
      const netSalary = Math.max(0, Math.round((basicSalary + allowances - deductions) * 100) / 100);
      if (netSalary <= 0) throw AppError.validation('Net salary must be greater than zero');

      const salaryNo = await sequenceService.generateSequence('SAL', branchId, session);
      const salaryMonth = data.salaryMonth || new Date().toISOString().slice(0, 7);
      const paymentMode = (data.paymentMode || 'BANK').toUpperCase();

      const expenseSeqNo = await sequenceService.generateVoucherNo(branchId, session);
      const expenseNo = `EXP-${branch.branchCode}-${Date.now().toString().slice(-6)}-${expenseSeqNo.slice(-3)}`;
      const expense = await Expense.create([{
        expenseNo,
        branchId,
        category: 'Salary',
        amount: netSalary,
        paymentMode,
        vendor: employee.fullName,
        description: `Salary payment for ${employee.fullName} (${employee.employeeCode}) - ${salaryMonth}`,
        approvalStatus: 'APPROVED',
        accountHeadId: salaryHead._id,
        createdBy: userId,
        updatedBy: userId,
      }], { session });

      const paidExpense = await expenseService.payExpense(expense[0]._id, userId, session);

      const salary = await SalaryPayment.create([{
        salaryNo,
        employeeId: employee._id,
        branchId,
        salaryMonth,
        basicSalary,
        allowances,
        deductions,
        netSalary,
        paymentMode,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        remarks: data.remarks,
        expenseId: paidExpense._id,
        voucherId: paidExpense.voucherId,
        status: 'PAID',
        createdBy: userId,
        updatedBy: userId,
      }], { session });

      await session.commitTransaction();
      session.endSession();
      return salary[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

const salaryPaymentService = new SalaryPaymentService();
export default salaryPaymentService;
export { salaryPaymentService as SalaryPaymentServiceInstance };
