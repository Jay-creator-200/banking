'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { ShieldAlert, Calendar, CheckCircle, HelpCircle, ArrowRight, XCircle } from 'lucide-react';

export default function ClosingPage() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [closingStatus, setClosingStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Dialog triggers
  const [confirmDayOpen, setConfirmDayOpen] = useState(false);
  const [confirmDayLoading, setConfirmDayLoading] = useState(false);
  const [confirmMonthOpen, setConfirmMonthOpen] = useState(false);
  const [confirmMonthLoading, setConfirmMonthLoading] = useState(false);

  // Month closing parameters
  const [monthYear, setMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Load branches
  useEffect(() => {
    fetch('/api/branches?limit=100')
      .then(res => res.ok && res.json())
      .then(json => {
        if (json && json.data.length > 0) {
          setBranches(json.data);
          setSelectedBranch(json.data[0]._id);
        }
      })
      .catch(err => console.error('Failed to load branches:', err));
  }, []);

  // Fetch Closing status
  const fetchStatus = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/closing/status?branchId=${selectedBranch}`);
      if (res.ok) {
        const json = await res.json();
        setClosingStatus(json.data);
      }
    } catch (err) {
      console.error('Failed to load closing status:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Execute Day End Closing
  const handleDayEndClose = async () => {
    setConfirmDayLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/closing/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: selectedBranch }),
      });
      const json = await res.json();
      
      if (res.ok) {
        setSuccessMessage(`Business Day ${new Date(closingStatus.currentBusinessDate).toLocaleDateString()} closed successfully. Advanced to ${new Date(json.data.date || new Date()).toLocaleDateString()}`);
        fetchStatus();
        setConfirmDayOpen(false);
      } else {
        // Validation fails
        setErrorMessage(json.message || 'Validation failed. Ensure there are no pending approvals or unbalanced books.');
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Failed to execute Day End closing.');
    } finally {
      setConfirmDayLoading(false);
    }
  };

  // Execute Month End Closing
  const handleMonthEndClose = async () => {
    setConfirmMonthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/closing/month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranch,
          year: monthYear.year,
          month: monthYear.month
        }),
      });
      const json = await res.json();

      if (res.ok) {
        setSuccessMessage(`Month End closing completed successfully. Subsidiary ledgers reconciled.`);
        fetchStatus();
        setConfirmMonthOpen(false);
      } else {
        setErrorMessage(json.message || 'Month closing verification failed. Please verify trial balance balances.');
      }
    } catch (err) {
      setErrorMessage('Failed to execute Month End closing.');
    } finally {
      setConfirmMonthLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger Period Closing"
        subtitle="Maker-checker day end closing parameters and monthly bookkeeping checkout."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Control Card */}
        <div className="lg:col-span-1 space-y-6">
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Select Branch</h3>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none"
            >
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>
            
            {loading ? (
              <div className="py-10 flex justify-center"><LoadingSpinner size="sm" /></div>
            ) : closingStatus && (
              <div className="mt-6 space-y-4 border-t border-slate-100 dark:border-slate-850 pt-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Active Business Date</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      {new Date(closingStatus.currentBusinessDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Previous date transactions are locked.</span>
                </div>
              </div>
            )}
          </CardWrapper>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-450 text-xs font-semibold flex gap-2.5 items-start">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Closing Checklist Interrupted:</span>
                <p className="mt-1 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold flex gap-2.5 items-start animate-in fade-in duration-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Success:</span>
                <p className="mt-1 leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Operations Hub */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Day closing widget */}
            <CardWrapper className="p-6 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150">Business Day End Closing</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Advances the society&apos;s active posting date, verifies that teller cash books match actual drawer assets, and locks journal postings.
                </p>
              </div>
              <button
                onClick={() => setConfirmDayOpen(true)}
                disabled={loading || !closingStatus}
                className="mt-6 w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
              >
                Close Business Day
              </button>
            </CardWrapper>

            {/* Month closing widget */}
            <CardWrapper className="p-6 flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150">Month End Reconciliation</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Triggers interest accrual evaluations, verifies trial balance balancing, and reconciles savings/loan ledgers against General Ledger totals.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <select
                    value={monthYear.month}
                    onChange={(e) => setMonthYear({ ...monthYear, month: parseInt(e.target.value, 10) })}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{new Date(2020, m-1, 1).toLocaleString('en', { month: 'short' })}</option>
                    ))}
                  </select>
                  <select
                    value={monthYear.year}
                    onChange={(e) => setMonthYear({ ...monthYear, year: parseInt(e.target.value, 10) })}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setConfirmMonthOpen(true)}
                disabled={loading || !closingStatus}
                className="mt-6 w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-600/15"
              >
                Execute Month Closing
              </button>
            </CardWrapper>

          </div>

          {/* Closing History list */}
          <CardWrapper className="p-6">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Day End Closings Audit History</h4>
            {closingStatus?.history && closingStatus.history.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3">Closed Date</th>
                      <th className="px-4 py-3 text-right">Opening Cash (₹)</th>
                      <th className="px-4 py-3 text-right">Closing Cash (₹)</th>
                      <th className="px-4 py-3">Closing Agent</th>
                      <th className="px-4 py-3">Closed At</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closingStatus.history.map((h, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 text-slate-700 dark:text-slate-300 font-medium">
                        <td className="px-4 py-3 font-semibold">{new Date(h.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">₹{h.openingBalance.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">₹{h.closingBalance.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-mono">{h.closedBy}</td>
                        <td className="px-4 py-3">{new Date(h.closedAt).toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusBadge status="CLOSED" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-10">No recent closed business days registered in this branch.</p>
            )}
          </CardWrapper>

        </div>

      </div>

      {/* Confirm Day Closing Dialog */}
      <ConfirmDialog
        isOpen={confirmDayOpen}
        onClose={() => setConfirmDayOpen(false)}
        onConfirm={handleDayEndClose}
        loading={confirmDayLoading}
        title="Execute Day End Closing?"
        description={`Are you absolutely sure you want to close the business date: ${closingStatus && new Date(closingStatus.currentBusinessDate).toLocaleDateString()}? This operation verifies teller cash counts and locks journal entries. This cannot be undone.`}
        confirmLabel="Execute Day End"
        cancelLabel="Discard"
      />

      {/* Confirm Month Closing Dialog */}
      <ConfirmDialog
        isOpen={confirmMonthOpen}
        onClose={() => setConfirmMonthOpen(false)}
        onConfirm={handleMonthEndClose}
        loading={confirmMonthLoading}
        title="Execute Month End Closing?"
        description={`Reconcile sub-ledgers and close the accounting book for period: ${monthYear.month}/${monthYear.year}? System validates Trial Balance balances before locking.`}
        confirmLabel="Execute Month Close"
        cancelLabel="Discard"
      />
    </div>
  );
}
