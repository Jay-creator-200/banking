'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';
const Field = ({ label, children }) => (<div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{label}</label>{children}</div>);

export default function DisbursementPage() {
  const router = useRouter();
  const [approvedApps, setApprovedApps] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [form, setForm] = useState({ applicationId: '', disbursementDate: new Date().toISOString().split('T')[0], disbursementMode: 'CASH', sessionId: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const [aRes, sRes] = await Promise.all([
        fetch('/api/loan-applications?applicationStatus=approved&limit=100'),
        fetch('/api/cash-sessions?status=OPEN&limit=20'),
      ]);
      if (aRes.ok) { const j = await aRes.json(); setApprovedApps(j.data || []); }
      if (sRes.ok) { const j = await sRes.json(); setSessions(j.data || []); }
    }
    load();
  }, []);

  const handleSelectApp = (appId) => {
    const app = approvedApps.find((a) => a._id === appId);
    setSelectedApp(app);
    setForm(p => ({ ...p, applicationId: appId }));
  };

  const handleDisburse = async () => {
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/loans/disbursement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess(`Loan ${json.data?.loanNo} disbursed successfully! EMI schedule generated.`);
        setSelectedApp(null);
        setForm({ applicationId: '', disbursementDate: new Date().toISOString().split('T')[0], disbursementMode: 'CASH', sessionId: '', remarks: '' });
        setApprovedApps(prev => prev.filter(a => a._id !== form.applicationId));
      } else {
        setError(json.error?.message || 'Disbursement failed');
      }
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-650"><ArrowLeft className="w-4 h-4" /></button>
        <PageHeader title="Loan Disbursement" subtitle="Disburse approved loans and generate EMI schedules." breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Disbursement', href: '#' }]} />
      </div>

      {error && <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Select Application */}
        <CardWrapper className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Select Approved Application</h3>
          {approvedApps.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No approved applications pending disbursement</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {approvedApps.map((app) => (
                <button key={app._id}
                  onClick={() => handleSelectApp(app._id)}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${selectedApp?._id === app._id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-indigo-650">{app.applicationNo}</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">₹{app.approvedAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{app.memberId?.fullName}</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">{app.loanProductId?.productName} · {app.approvedTenure} months</p>
                </button>
              ))}
            </div>
          )}
        </CardWrapper>

        {/* Disbursement Form */}
        <div className="space-y-4">
          <CardWrapper className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Disbursement Details</h3>
            <Field label="Disbursement Date *"><input type="date" className={inputCls} value={form.disbursementDate} onChange={(e) => setForm(p => ({ ...p, disbursementDate: e.target.value }))} /></Field>
            <Field label="Disbursement Mode *">
              <select className={inputCls} value={form.disbursementMode} onChange={(e) => setForm(p => ({ ...p, disbursementMode: e.target.value }))}>
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Bank Transfer</option>
                <option value="ACCOUNT_CREDIT">Account Credit</option>
                <option value="RTGS">RTGS</option>
                <option value="ONLINE">Online</option>
              </select>
            </Field>
            {form.disbursementMode === 'CASH' && sessions.length > 0 && (
              <Field label="Teller Session">
                <select className={inputCls} value={form.sessionId} onChange={(e) => setForm(p => ({ ...p, sessionId: e.target.value }))}>
                  <option value="">Select open session...</option>
                  {sessions.map((s) => <option key={s._id} value={s._id}>{s.sessionCode || s._id} — ₹{s.openingBalance?.toLocaleString('en-IN')}</option>)}
                </select>
              </Field>
            )}
            <Field label="Remarks"><textarea className={`${inputCls} resize-none`} rows={2} value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} /></Field>

            {/* Summary */}
            {selectedApp && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Disbursement Summary</p>
                <div className="flex justify-between"><span className="text-slate-500">Member</span><span className="font-semibold">{selectedApp.memberId?.fullName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Product</span><span>{selectedApp.loanProductId?.productName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Approved Amount</span><span className="font-mono font-bold text-indigo-650">₹{selectedApp.approvedAmount?.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tenure</span><span>{selectedApp.approvedTenure} months</span></div>
              </div>
            )}

            <button
              onClick={handleDisburse}
              disabled={submitting || !form.applicationId}
              className="w-full py-3 text-sm font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all"
            >
              {submitting ? 'Disbursing...' : '🏦 Disburse Loan & Generate Schedule'}
            </button>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
