'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import Modal from '@/components/shared/Modal.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import { Coins, Plus, CheckCircle, XCircle, TrendingUp, HelpCircle, DollarSign, Wallet, Printer } from 'lucide-react';

export default function BudgetExpensesPage() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown options
  const [accountHeads, setAccountHeads] = useState([]);

  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'Utilities',
    amount: '',
    paymentMode: 'CASH',
    vendor: '',
    description: '',
    accountHeadId: ''
  });

  // Budget comparison state
  const [fiscalYear] = useState('2026-2027');
  const [budgetComparison, setBudgetComparison] = useState([]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    department: 'Operations',
    accountHeadId: '',
    allocatedAmount: ''
  });

  // Load basic selections
  useEffect(() => {
    // Branches
    fetch('/api/branches?limit=100')
      .then(res => res.ok && res.json())
      .then(json => {
        if (json && json.data.length > 0) {
          setBranches(json.data);
          setSelectedBranch(json.data[0]._id);
        }
      })
      .catch(err => console.error(err));

    // Account Heads
    fetch('/api/account-heads')
      .then(res => res.ok && res.json())
      .then(json => {
        if (json) {
          const list = [];
          const traverse = (nodes) => {
            nodes.forEach((n) => {
              // Only load Expense account heads for budgets and expense creation
              if (n.type === 'EXPENSE') {
                list.push({ _id: n._id, name: n.name, code: n.code });
              }
              if (n.children && n.children.length > 0) traverse(n.children);
            });
          };
          traverse(json.data);
          setAccountHeads(list);
          if (list.length > 0) {
            setExpenseForm(prev => ({ ...prev, accountHeadId: list[0]._id }));
            setBudgetForm(prev => ({ ...prev, accountHeadId: list[0]._id }));
          }
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/expenses?branchId=${selectedBranch}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  // Fetch Budget comparison
  const fetchBudgetReport = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/budgets/compare?branchId=${selectedBranch}&fiscalYear=${fiscalYear}`);
      if (res.ok) {
        const json = await res.json();
        setBudgetComparison(json.data.comparison);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, fiscalYear]);

  useEffect(() => {
    if (activeTab === 'expenses') {
      fetchExpenses();
    } else {
      fetchBudgetReport();
    }
  }, [activeTab, fetchExpenses, fetchBudgetReport]);

  // Handle Expense Creation
  const handleExpenseSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          branchId: selectedBranch,
          amount: parseFloat(expenseForm.amount)
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Expense logged and submitted for approval successfully!');
        setExpenseForm(prev => ({ ...prev, amount: '', vendor: '', description: '' }));
        setIsExpenseModalOpen(false);
        fetchExpenses();
      } else {
        setErrorMsg(json.message || 'Validation failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to log expense.');
    }
  };

  // Handle Budget allocation update
  const handleBudgetSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...budgetForm,
          branchId: selectedBranch,
          fiscalYear,
          allocatedAmount: parseFloat(budgetForm.allocatedAmount)
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Budget allocation configured successfully!');
        setBudgetForm(prev => ({ ...prev, allocatedAmount: '' }));
        setIsBudgetModalOpen(false);
        fetchBudgetReport();
      } else {
        setErrorMsg(json.message || 'Validation failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to configure budget.');
    }
  };

  // Trigger expense payout
  const handlePayExpense = async (expenseId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/expenses/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Expense cash payout executed and posted to General Ledger.');
        fetchExpenses();
      } else {
        setErrorMsg(json.message || 'Payout transaction failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to execute payment.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets & Expenditure Desk"
        subtitle="Departmental budget planning, operational expenses logging, and teller cash payout checkouts."
        action={
          <div className="flex gap-2">
            {activeTab === 'expenses' ? (
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-indigo-650 text-white rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Log Expense
              </button>
            ) : (
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-emerald-650 text-white rounded-xl hover:bg-emerald-700 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Allocate Budget
              </button>
            )}
          </div>
        }
      />

      {/* Control Banner */}
      <CardWrapper className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Coins className="w-4 h-4 text-slate-400" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 focus:outline-none"
          >
            {branches.map(b => (
              <option key={b._id} value={b._id}>{b.branchName}</option>
            ))}
          </select>
          {activeTab === 'budgets' && (
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-350">
              Fiscal Year: {fiscalYear}
            </span>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 bg-slate-100/80 dark:bg-slate-900/40 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white dark:bg-slate-950 text-indigo-650 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Branch Expenses
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`px-4.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'budgets'
                ? 'bg-white dark:bg-slate-950 text-indigo-650 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Budget vs Actuals
          </button>
        </div>
      </CardWrapper>

      {/* Alert Feedbacks */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 text-rose-800 text-xs font-semibold flex gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 text-xs font-semibold flex gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Contents */}
      {loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'expenses' ? (
        <CardWrapper className="overflow-hidden">
          {expenses.length > 0 ? (
            <div className="text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-4">Expense No</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Account Head</th>
                    <th className="px-5 py-4">Vendor</th>
                    <th className="px-5 py-4 text-right">Amount (₹)</th>
                    <th className="px-5 py-4">Mode</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 text-slate-700 dark:text-slate-300 font-medium">
                      <td className="px-5 py-4 font-bold font-mono text-slate-900 dark:text-slate-100">{e.expenseNo}</td>
                      <td className="px-5 py-4 font-semibold">{e.category}</td>
                      <td className="px-5 py-4">
                        <span>{e.accountHeadId?.name || 'Unmapped'}</span>
                        <span className="block text-[9px] font-bold text-slate-450 mt-0.5">{e.accountHeadId?.code}</span>
                      </td>
                      <td className="px-5 py-4">{e.vendor}</td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900 dark:text-slate-100">₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-5 py-4"><StatusBadge status={e.paymentMode} /></td>
                      <td className="px-5 py-4"><StatusBadge status={e.approvalStatus} /></td>
                      <td className="px-5 py-4 text-center">
                        {e.approvalStatus === 'APPROVED' ? (
                          <button
                            onClick={() => handlePayExpense(e._id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition-all"
                          >
                            Mark Paid
                          </button>
                        ) : e.approvalStatus === 'PAID' ? (
                          <Link href={`/dashboard/receipts/expense/${e._id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                            <Printer className="w-3.5 h-3.5" /> Receipt
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-450 italic">Pending approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-12">No expense entries registered in this branch.</p>
          )}
        </CardWrapper>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgetComparison.map((b, idx) => {
            const util = b.utilizationPercentage;
            const overBudget = util > 100;
            return (
              <CardWrapper key={idx} className="p-6 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-650 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-md uppercase">{b.department}</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2">[{b.accountCode}] {b.accountName}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{util}% Utilized</span>
                      <span className="block text-[9px] text-slate-400 mt-1 uppercase">Variance: ₹{b.variance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden mt-4">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${overBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, util)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 dark:border-slate-850 pt-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Allocated Budget</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">₹{b.allocatedAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Actual Expended</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">₹{b.actualAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </CardWrapper>
            );
          })}
          {budgetComparison.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-12 text-center text-slate-500 text-xs">
              No budget allocations seeded for this branch and fiscal year.
            </div>
          )}
        </div>
      )}

      {/* Log Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Log Branch Expenditure"
      >
        <FormWrapper
          onSubmit={handleExpenseSubmit}
          submitLabel="Create & Submit Expense"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
                >
                  {['Salary', 'Rent', 'Utilities', 'Admin', 'Interest', 'Other'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">Account Head</label>
                <select
                  value={expenseForm.accountHeadId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, accountHeadId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
                >
                  {accountHeads.map(h => (
                    <option key={h._id} value={h._id}>[{h.code}] {h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">Payment Mode</label>
                <select
                  value={expenseForm.paymentMode}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
                >
                  <option value="CASH">CASH</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">Payee / Vendor Name</label>
              <input
                type="text"
                required
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
                placeholder="Payee Name"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">Description / Narration</label>
              <textarea
                rows={3}
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none resize-none"
                placeholder="Explain the expenditure..."
              />
            </div>
          </div>
        </FormWrapper>
      </Modal>

      {/* Allocate Budget Modal */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Configure Budget Allocation"
      >
        <FormWrapper
          onSubmit={handleBudgetSubmit}
          submitLabel="Update Allocation"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-355 uppercase mb-1.5">Department</label>
              <select
                value={budgetForm.department}
                onChange={(e) => setBudgetForm({ ...budgetForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
              >
                {['Operations', 'HR', 'IT Support', 'Loans', 'Marketing'].map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-355 uppercase mb-1.5">Account Head Group</label>
              <select
                value={budgetForm.accountHeadId}
                onChange={(e) => setBudgetForm({ ...budgetForm, accountHeadId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
              >
                {accountHeads.map(h => (
                  <option key={h._id} value={h._id}>[{h.code}] {h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-355 uppercase mb-1.5">Allocated Amount (₹)</label>
              <input
                type="number"
                required
                value={budgetForm.allocatedAmount}
                onChange={(e) => setBudgetForm({ ...budgetForm, allocatedAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
        </FormWrapper>
      </Modal>
    </div>
  );
}
