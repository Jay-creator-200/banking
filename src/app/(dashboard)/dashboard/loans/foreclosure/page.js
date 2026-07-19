'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';
const Field = ({ label, children }) => (<div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{label}</label>{children}</div>);

export default function ForeclosurePage() {
  const router = useRouter();
  const [loanNo, setLoanNo] = useState('');
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [calc, setCalc] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ loanId: '', paymentMode: 'CASH', sessionId: '', remarks: '' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const [lRes, sRes] = await Promise.all([
        fetch('/api/loans?loanStatus=active&limit=100'),
        fetch('/api/cash-sessions?status=OPEN&limit=20'),
      ]);
      if (lRes.ok) { const j = await lRes.json(); setLoans(j.data || []); }
      if (sRes.ok) { const j = await sRes.json(); setSessions(j.data || []); }
    }
    load();
  }, []);

  const handleSelectLoan = async (loanId) => {
    const loan = loans.find((l) => l._id === loanId);
    setSelectedLoan(loan);
    setForm(p => ({ ...p, loanId }));
    setCalc(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/loan-reports?reportType=foreclosure-calc&loanId=${loanId}`);
      if (res.ok) { const json = await res.json(); setCalc(json.data); }
    } finally { setLoading(false); }
  };

  const handleForeclosure = async () => {
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/loan-reports?action=foreclosure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess(`Loan ${selectedLoan?.loanNo} foreclosed successfully! Settlement: ₹${calc?.settlementAmount?.toLocaleString('en-IN')}`);
        setSelectedLoan(null); setCalc(null);
        setForm({ loanId: '', paymentMode: 'CASH', sessionId: '', remarks: '' });
      } else {
        setError(json.error?.message || 'Foreclosure failed');
      }
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"><ArrowLeft className="w-4 h-4 text-slate-650" /></button>
        <PageHeader title="Loan Foreclosure" subtitle="Process early loan closure with pre-closure charges." breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Foreclosure', href: '#' }]} />
      </div>

      {error && <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold"><AlertTriangle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" />{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardWrapper className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Select Loan</h3>
          <Field label="Active Loan *">
            <select className={inputCls} value={form.loanId} onChange={(e) => handleSelectLoan(e.target.value)}>
              <option value="">Select a loan to foreclose...</option>
              {loans.map((l) => <option key={l._id} value={l._id}>{l.loanNo} — {l.memberId?.fullName} (₹{l.outstandingPrincipal?.toLocaleString('en-IN')})</option>)}
            </select>
          </Field>

          {loading && <p className="text-xs text-indigo-600 animate-pulse">Calculating settlement...</p>}

          {calc && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-3">
              <p className="text-xs font-bold text-purple-800 dark:text-purple-300">Foreclosure Settlement — {calc.loanNo}</p>
              <div className="space-y-2 text-xs">
                {[
                  ['Outstanding Principal', calc.outstandingPrincipal, 'text-slate-800 dark:text-slate-200'],
                  ['Outstanding Interest', calc.outstandingInterest, 'text-amber-700'],
                  ['Outstanding Penalty', calc.outstandingPenalty, 'text-rose-600'],
                  [`Pre-closure Charge (${calc.preClosureRate}%)`, calc.preClosureCharge, 'text-purple-700'],
                ].map(([k, v, cls]) => (
                  <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className={`font-mono font-bold ${cls}`}>₹{v?.toLocaleString('en-IN')}</span></div>
                ))}
                <div className="flex justify-between border-t border-purple-200 dark:border-purple-800 pt-2">
                  <span className="font-bold text-purple-700 dark:text-purple-300">Total Settlement</span>
                  <span className="font-mono font-bold text-lg text-purple-700 dark:text-purple-300">₹{calc.settlementAmount?.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[10px] text-purple-500">{calc.remainingInstallments} installments remaining</p>
              </div>
            </div>
          )}
        </CardWrapper>

        <CardWrapper className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Process Foreclosure</h3>
          <Field label="Payment Mode *">
            <select className={inputCls} value={form.paymentMode} onChange={(e) => setForm(p => ({ ...p, paymentMode: e.target.value }))}>
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="RTGS">RTGS</option>
              <option value="ONLINE">Online</option>
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
          <Field label="Remarks"><textarea className={`${inputCls} resize-none`} rows={3} value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} placeholder="Reason for pre-closure..." /></Field>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl text-[10px] text-amber-700 font-semibold">
            ⚠ This action will permanently close the loan account and post accounting entries.
          </div>

          <button
            onClick={handleForeclosure}
            disabled={submitting || !form.loanId || !calc}
            className="w-full py-3 text-sm font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Processing...' : `🔒 Foreclose — ₹${calc?.settlementAmount?.toLocaleString('en-IN') || '—'}`}
          </button>
        </CardWrapper>
      </div>
    </div>
  );
}
