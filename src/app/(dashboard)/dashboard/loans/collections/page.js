'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle2, AlertTriangle, IndianRupee } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';
const Field = ({ label, children }) => (<div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{label}</label>{children}</div>);

export default function CollectionsPage() {
  const router = useRouter();
  const [searchLoanNo, setSearchLoanNo] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [nextDue, setNextDue] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ loanId: '', amount: '', paymentMode: 'CASH', sessionId: '', paymentDate: new Date().toISOString().split('T')[0], remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allocation, setAllocation] = useState(null);

  useEffect(() => {
    async function loadSessions() {
      const res = await fetch('/api/cash-sessions?status=OPEN&limit=20');
      if (res.ok) { const j = await res.json(); setSessions(j.data || []); }
    }
    loadSessions();
  }, []);

  const searchLoan = async () => {
    if (!searchLoanNo.trim()) return;
    try {
      const res = await fetch(`/api/loans?limit=5`);
      if (res.ok) {
        const json = await res.json();
        const found = json.data?.find((l) => l.loanNo?.toLowerCase() === searchLoanNo.toLowerCase());
        if (found) {
          setSelectedLoan(found);
          setForm(p => ({ ...p, loanId: found._id, amount: found.emiAmount || '' }));
          // Fetch schedule for next due
          const sRes = await fetch(`/api/loan-schedules/${found._id}`);
          if (sRes.ok) {
            const sJson = await sRes.json();
            const pending = (sJson.data || []).filter(s => ['pending', 'partial', 'overdue'].includes(s.paymentStatus));
            setNextDue(pending[0] || null);
          }
        } else {
          setError('No loan found with that number');
          setSelectedLoan(null);
        }
      }
    } catch { setError('Network error'); }
  };

  const handleCollect = async () => {
    setSubmitting(true); setError(''); setSuccess(''); setAllocation(null);
    try {
      const res = await fetch('/api/loan-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Payment recorded successfully!');
        setAllocation(json.data?.allocation);
        setForm(p => ({ ...p, amount: '', remarks: '' }));
      } else {
        setError(json.error?.message || 'Payment failed');
      }
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"><ArrowLeft className="w-4 h-4 text-slate-650" /></button>
        <PageHeader title="EMI Collections" subtitle="Collect loan EMI payments from members." breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Collections', href: '#' }]} />
      </div>

      {error && <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-emerald-700 text-xs font-semibold">{success}</p>
          {allocation && (
            <div className="mt-2 grid grid-cols-3 gap-3 text-center">
              {[['Principal', allocation.principalCollected], ['Interest', allocation.interestCollected], ['Penalty', allocation.penaltyCollected]].map(([k, v]) => (
                <div key={k} className="bg-emerald-100 rounded-lg p-2">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">{k}</p>
                  <p className="font-mono font-bold text-xs text-emerald-800">₹{v?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Search */}
        <CardWrapper className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Find Loan</h3>
          <div className="flex gap-2">
            <input
              value={searchLoanNo}
              onChange={(e) => setSearchLoanNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLoan()}
              placeholder="Enter loan number (e.g. LN-2026-000001)"
              className={inputCls}
            />
            <button onClick={searchLoan} className="px-3 py-2 bg-indigo-650 text-white rounded-xl hover:bg-indigo-700 cursor-pointer shrink-0"><Search className="w-4 h-4" /></button>
          </div>

          {selectedLoan && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">{selectedLoan.loanNo}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Member', selectedLoan.memberId?.fullName],
                    ['Status', selectedLoan.loanStatus?.toUpperCase()],
                    ['Outstanding', `₹${selectedLoan.outstandingPrincipal?.toLocaleString('en-IN')}`],
                    ['EMI Amount', `₹${selectedLoan.emiAmount?.toLocaleString('en-IN')}`],
                    ['Overdue', `₹${selectedLoan.overdueAmount?.toLocaleString('en-IN') || 0}`],
                    ['Next Due', selectedLoan.nextDueDate ? new Date(selectedLoan.nextDueDate).toLocaleDateString('en-IN') : '—'],
                  ].map(([k, v]) => (
                    <div key={k}><p className="text-[9px] text-slate-400 uppercase">{k}</p><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{v}</p></div>
                  ))}
                </div>
              </div>

              {nextDue && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs">
                  <p className="font-bold text-amber-800 dark:text-amber-400 mb-2">Next Installment — #{nextDue.installmentNo}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Principal', nextDue.principalDue - nextDue.principalPaid], ['Interest', nextDue.interestDue - nextDue.interestPaid], ['Penalty', (nextDue.penaltyDue || 0) - (nextDue.penaltyPaid || 0)]].map(([k, v]) => (
                      <div key={k} className="bg-amber-100 dark:bg-amber-900/20 rounded-lg p-2">
                        <p className="text-[9px] font-bold text-amber-600 uppercase">{k}</p>
                        <p className="font-mono font-bold text-amber-900 dark:text-amber-300">₹{v?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-center font-bold text-amber-800 dark:text-amber-300 mt-2 text-sm">Total: ₹{((nextDue.principalDue - nextDue.principalPaid) + (nextDue.interestDue - nextDue.interestPaid) + ((nextDue.penaltyDue || 0) - (nextDue.penaltyPaid || 0))).toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </CardWrapper>

        {/* Payment Form */}
        <CardWrapper className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Record Payment</h3>
          <Field label="Payment Amount (₹) *"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" /></Field>
          <Field label="Payment Mode *">
            <select className={inputCls} value={form.paymentMode} onChange={(e) => setForm(p => ({ ...p, paymentMode: e.target.value }))}>
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </Field>
          {form.paymentMode === 'CASH' && sessions.length > 0 && (
            <Field label="Teller Session">
              <select className={inputCls} value={form.sessionId} onChange={(e) => setForm(p => ({ ...p, sessionId: e.target.value }))}>
                <option value="">Select session...</option>
                {sessions.map((s) => <option key={s._id} value={s._id}>{s.sessionCode || s._id}</option>)}
              </select>
            </Field>
          )}
          <Field label="Payment Date"><input type="date" className={inputCls} value={form.paymentDate} onChange={(e) => setForm(p => ({ ...p, paymentDate: e.target.value }))} /></Field>
          <Field label="Remarks"><textarea className={`${inputCls} resize-none`} rows={2} value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} /></Field>

          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl text-[10px] text-indigo-600 font-semibold">
            💡 Payment allocation: <span className="text-rose-600">Penalty</span> → <span className="text-amber-600">Interest</span> → <span className="text-indigo-650">Principal</span>
          </div>

          <button
            onClick={handleCollect}
            disabled={submitting || !form.loanId || !form.amount}
            className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Processing...' : '✓ Collect Payment'}
          </button>
        </CardWrapper>
      </div>
    </div>
  );
}
