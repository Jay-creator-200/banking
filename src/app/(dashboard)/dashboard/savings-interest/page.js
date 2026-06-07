'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Percent, 
  AlertCircle, 
  CheckCircle,
  Play,
  Info,
  Building,
  Calendar
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function SavingsInterestPostingPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    branchId: '',
    periodStart: '',
    periodEnd: '',
  });

  // Fetch branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches?limit=100');
        if (res.ok) {
          const json = await res.json();
          setBranches(json.data || []);
        }
      } catch (e) {
        console.error('Failed to load branches:', e);
      }
    }
    loadBranches();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.periodStart || !formData.periodEnd) {
      setSubmitError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/savings-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: formData.branchId || null,
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to post batch interest credits.');
      }

      setSubmitSuccess(json.data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/savings-accounts')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-650"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Batch Interest Posting Console"
          subtitle="Batch execute annual product interest calculations for all active savings accounts and queue credits."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Savings', href: '/dashboard/savings-accounts' },
            { label: 'Interest Posting', href: '#' },
          ]}
        />
      </div>

      {submitError && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-450 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Execution Failed</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-emerald-700 dark:text-emerald-450 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Batch Processing Completed</p>
            <p className="mt-0.5">{submitSuccess.message}</p>
            <ul className="mt-2 space-y-1 text-xs list-disc pl-5">
              <li>Processed Accounts: <span className="font-mono font-bold">{submitSuccess.count}</span></li>
              <li>Total Interest Posted: <span className="font-mono font-bold">₹{submitSuccess.totalInterest?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></li>
            </ul>
            <p className="text-[10px] text-slate-450 dark:text-slate-550 mt-3 font-semibold uppercase tracking-wider">Note: Interest postings require checker approval before balances are modified.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run Console Form */}
        <div className="lg:col-span-2 space-y-6">
          <CardWrapper className="p-6 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Percent className="w-5 h-5 text-indigo-650" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Configure Batch Run</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Branch</label>
                  <select
                    name="branchId"
                    value={formData.branchId}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
                  >
                    <option value="">All Branches (Consolidated Run)</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Interest Start Date *</label>
                  <input
                    type="date"
                    name="periodStart"
                    value={formData.periodStart}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Interest End Date *</label>
                  <input
                    type="date"
                    name="periodEnd"
                    value={formData.periodEnd}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/savings-accounts')}
                  className="px-6 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {loading ? 'Processing Batch...' : 'Post Batch Interest'}
                </button>
              </div>
            </form>
          </CardWrapper>
        </div>

        {/* Sidebar Info Card */}
        <div className="lg:col-span-1">
          <CardWrapper className="p-5 space-y-4 border border-indigo-50/60 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-900">
              <Info className="w-4 h-4 text-indigo-650 animate-bounce" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Interest Rules Info</h4>
            </div>
            
            <div className="space-y-3 text-[11px] text-slate-600 dark:text-slate-400">
              <p>Noble Cooperative Bank operates savings accounts interest calculation using the **Daily Closing Product Method**.</p>
              <ul className="list-disc pl-4 space-y-1.5 font-sans">
                <li>Balances are calculated at midnight closing each day.</li>
                <li>Interest rate defaults are based on account tier: Regular (4.0%), Staff (5.5%), and Senior Citizens (4.5%).</li>
                <li>Batch executions post interest as pending transaction vouchers. No balance changes are posted until Checker approves them.</li>
              </ul>
            </div>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
