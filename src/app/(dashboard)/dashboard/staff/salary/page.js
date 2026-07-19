'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, Plus, Printer, RefreshCcw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function StaffSalaryPage() {
  const [users, setUsers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    salaryMonth: new Date().toISOString().slice(0, 7),
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    paymentMode: 'BANK',
    remarks: '',
  });

  const selectedEmployee = useMemo(() => users.find((u) => u._id === form.employeeId), [users, form.employeeId]);
  const netSalary = Math.max(0, Number(form.basicSalary || 0) + Number(form.allowances || 0) - Number(form.deductions || 0));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userRes, salaryRes] = await Promise.all([
        fetch('/api/users?limit=100'),
        fetch('/api/staff/salary'),
      ]);
      const [userJson, salaryJson] = await Promise.all([userRes.json(), salaryRes.json()]);
      if (!userRes.ok) throw new Error(userJson.error?.message || 'Failed to load staff');
      if (!salaryRes.ok) throw new Error(salaryJson.error?.message || 'Failed to load salaries');
      const staff = userJson.data || [];
      setUsers(staff);
      setSalaries(salaryJson.data || []);
      setForm((prev) => prev.employeeId || !staff[0] ? prev : ({
        ...prev,
        employeeId: staff[0]._id,
        basicSalary: staff[0].monthlySalary || 0,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const submitSalary = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/staff/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          basicSalary: Number(form.basicSalary || 0),
          allowances: Number(form.allowances || 0),
          deductions: Number(form.deductions || 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to process salary');
      setMessage('Salary paid and posted to accounts as salary expense.');
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Salary"
        subtitle="Pay employee salary and post it automatically as Staff Salary Expense in accounts."
        icon={Banknote}
        action={
          <div className="flex gap-2">
            <button onClick={loadData} className="p-2 rounded-xl border border-slate-200 text-slate-500 bg-white"><RefreshCcw className="w-4 h-4" /></button>
            <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
              <Plus className="w-4 h-4" /> Pay Salary
            </button>
          </div>
        }
      />

      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">{error}</div>}
      {message && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">{message}</div>}

      {showForm && (
        <CardWrapper className="p-5">
          <form onSubmit={submitSalary} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Employee</label>
                <select
                  className={inputClass}
                  value={form.employeeId}
                  onChange={(e) => {
                    const employee = users.find((u) => u._id === e.target.value);
                    setForm({ ...form, employeeId: e.target.value, basicSalary: employee?.monthlySalary || 0 });
                  }}
                  required
                >
                  {users.map((u) => <option key={u._id} value={u._id}>{u.fullName} ({u.employeeCode})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Salary Month</label>
                <input type="month" className={inputClass} value={form.salaryMonth} onChange={(e) => setForm({ ...form, salaryMonth: e.target.value })} required />
              </div>
              <div>
                <label className={labelClass}>Payment Mode</label>
                <select className={inputClass} value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  <option value="BANK">Bank</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Basic Salary</label>
                <input type="number" min="0" className={inputClass} value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} required />
              </div>
              <div>
                <label className={labelClass}>Allowances</label>
                <input type="number" min="0" className={inputClass} value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Deductions</label>
                <input type="number" min="0" className={inputClass} value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Remarks</label>
                <input className={inputClass} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional payroll note" />
              </div>
              <div>
                <label className={labelClass}>Net Salary</label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-slate-900">{money(netSalary)}</div>
              </div>
            </div>
            {selectedEmployee && (
              <p className="text-xs text-slate-500">{selectedEmployee.designation || 'Staff'} - {selectedEmployee.department || 'Department not set'}</p>
            )}
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">
              {submitting ? 'Posting...' : 'Pay and Post Salary'}
            </button>
          </form>
        </CardWrapper>
      )}

      {loading ? (
        <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : (
        <CardWrapper className="overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Salary No</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Net Salary</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((salary) => (
                <tr key={salary._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-bold">{salary.salaryNo}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold">{salary.employeeId?.fullName}</span>
                    <span className="block text-[10px] text-slate-400">{salary.employeeId?.employeeCode}</span>
                  </td>
                  <td className="px-4 py-3">{salary.salaryMonth}</td>
                  <td className="px-4 py-3 text-right font-black">{money(salary.netSalary)}</td>
                  <td className="px-4 py-3"><StatusBadge status={salary.paymentMode} /></td>
                  <td className="px-4 py-3"><StatusBadge status={salary.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/receipts/salary/${salary._id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                      <Printer className="w-4 h-4" /> Print
                    </Link>
                  </td>
                </tr>
              ))}
              {salaries.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No salary payments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </CardWrapper>
      )}
    </div>
  );
}
