'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, Send, UserCheck, Home, Car, Gem, AlertTriangle, Plus, Trash2
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function LoanApplicationDetailPage({ params }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [approveForm, setApproveForm] = useState({ approvedAmount: '', approvedTenure: '', remarks: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [newGuarantor, setNewGuarantor] = useState({ name: '', mobile: '', relationship: '', guaranteedAmount: '' });
  const [newCollateral, setNewCollateral] = useState({ collateralType: 'property', description: '', marketValue: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loan-applications/${id}`);
      if (res.ok) { const j = await res.json(); setData(j.data); }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const action = async (url, method, body, msg) => {
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (res.ok) { setSuccess(msg); fetchData(); setApproveModal(false); setRejectModal(false); }
      else setError(json.error?.message || 'Action failed');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const addGuarantor = () => action('/api/loan-guarantors', 'POST', { ...newGuarantor, loanApplicationId: id, guaranteedAmount: parseFloat(newGuarantor.guaranteedAmount) }, 'Guarantor added');
  const addCollateral = () => action('/api/loan-collaterals', 'POST', { ...newCollateral, loanApplicationId: id, marketValue: parseFloat(newCollateral.marketValue) }, 'Collateral added');

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center p-8 text-slate-500 text-sm">Application not found.</div>;

  const { application, guarantors = [], collaterals = [] } = data;
  const app = application;

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';
  const canApprove = ['submitted', 'under_review'].includes(app.applicationStatus);

  const COLLATERAL_ICONS = { property: Home, vehicle: Car, gold: Gem };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-650"><ArrowLeft className="w-4 h-4" /></button>
        <PageHeader
          title={`Application — ${app.applicationNo}`}
          subtitle={`${app.memberId?.fullName} · ${app.loanProductId?.productName}`}
          breadcrumbs={[{ label: 'Applications', href: '/dashboard/loans/applications' }, { label: app.applicationNo, href: '#' }]}
        />
        <div className="ml-auto flex gap-2">
          {app.applicationStatus === 'submitted' && (
            <button onClick={() => action(`/api/loan-applications/${id}`, 'PUT', { applicationStatus: 'under_review' }, 'Marked under review')} className="px-3 py-2 text-[11px] font-bold border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl cursor-pointer">Mark Under Review</button>
          )}
          {canApprove && (
            <>
              <button onClick={() => { setApproveForm({ approvedAmount: app.requestedAmount, approvedTenure: app.requestedTenureMonths, remarks: '' }); setApproveModal(true); }} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
              <button onClick={() => setRejectModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"><XCircle className="w-3.5 h-3.5" /> Reject</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">{error}</div>}
      {success && <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Application Details */}
        <div className="lg:col-span-2 space-y-5">
          <CardWrapper className="p-5">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4">Application Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs">
              {[
                ['Member', app.memberId?.fullName], ['Member No', app.memberId?.memberNo],
                ['Branch', app.branchId?.branchName], ['Product', app.loanProductId?.productName],
                ['Requested Amount', `₹${app.requestedAmount?.toLocaleString('en-IN')}`], ['Requested Tenure', `${app.requestedTenureMonths} months`],
                ['Interest Rate', `${app.loanProductId?.interestRate}%`], ['Interest Type', app.loanProductId?.interestType],
                ['Processing Fee', `₹${app.processingFee?.toLocaleString('en-IN') || 0}`],
                ['Status', <span key="s" className="uppercase font-bold text-indigo-650">{app.applicationStatus?.replace('_', ' ')}</span>],
                ['Date', new Date(app.applicationDate).toLocaleDateString('en-IN')],
              ].map(([k, v]) => (
                <div key={k}><p className="text-[9px] font-bold text-slate-400 uppercase">{k}</p><p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{v || '—'}</p></div>
              ))}
            </div>
            {app.purpose && <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900"><p className="text-[9px] font-bold text-slate-400 uppercase">Purpose</p><p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{app.purpose}</p></div>}
          </CardWrapper>

          {/* Guarantors */}
          <CardWrapper className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Guarantors ({guarantors.length})</h3>
            </div>
            {guarantors.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No guarantors added</p>}
            <div className="space-y-2">
              {guarantors.map((g) => (
                <div key={g._id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs">
                  <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1"><p className="font-bold text-slate-800 dark:text-slate-200">{g.name}</p><p className="text-slate-450 text-[10px]">{g.relationship} · {g.mobile}</p></div>
                  <span className="font-mono font-bold text-emerald-700">₹{g.guaranteedAmount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            {canApprove && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 grid grid-cols-4 gap-2">
                <input placeholder="Name *" className={inputCls} value={newGuarantor.name} onChange={(e) => setNewGuarantor(p => ({ ...p, name: e.target.value }))} />
                <input placeholder="Mobile" className={inputCls} value={newGuarantor.mobile} onChange={(e) => setNewGuarantor(p => ({ ...p, mobile: e.target.value }))} />
                <input placeholder="Relationship" className={inputCls} value={newGuarantor.relationship} onChange={(e) => setNewGuarantor(p => ({ ...p, relationship: e.target.value }))} />
                <input type="number" placeholder="Amount" className={inputCls} value={newGuarantor.guaranteedAmount} onChange={(e) => setNewGuarantor(p => ({ ...p, guaranteedAmount: e.target.value }))} />
                <button onClick={addGuarantor} className="col-span-4 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 cursor-pointer flex items-center justify-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Guarantor</button>
              </div>
            )}
          </CardWrapper>

          {/* Collaterals */}
          <CardWrapper className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Collateral ({collaterals.length})</h3>
            </div>
            {collaterals.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No collateral added</p>}
            <div className="space-y-2">
              {collaterals.map((c) => {
                const Icon = COLLATERAL_ICONS[c.collateralType] || Home;
                return (
                  <div key={c._id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs">
                    <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1"><p className="font-bold text-slate-800 dark:text-slate-200">{c.description}</p><p className="text-slate-450 text-[10px] capitalize">{c.collateralType} · {c.verificationStatus}</p></div>
                    <span className="font-mono font-bold text-amber-700">₹{c.marketValue?.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
            {canApprove && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 grid grid-cols-2 gap-2">
                <select className={inputCls} value={newCollateral.collateralType} onChange={(e) => setNewCollateral(p => ({ ...p, collateralType: e.target.value }))}>
                  <option value="property">Property</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="gold">Gold</option>
                  <option value="deposit">Deposit</option>
                  <option value="other">Other</option>
                </select>
                <input type="number" placeholder="Market Value (₹)" className={inputCls} value={newCollateral.marketValue} onChange={(e) => setNewCollateral(p => ({ ...p, marketValue: e.target.value }))} />
                <input placeholder="Description *" className={`${inputCls} col-span-2`} value={newCollateral.description} onChange={(e) => setNewCollateral(p => ({ ...p, description: e.target.value }))} />
                <button onClick={addCollateral} className="col-span-2 py-2 text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 cursor-pointer flex items-center justify-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Collateral</button>
              </div>
            )}
          </CardWrapper>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Status Timeline */}
          <CardWrapper className="p-5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Status Timeline</h4>
            {['draft', 'submitted', 'under_review', 'approved'].map((s, i) => {
              const statuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];
              const currentIdx = statuses.indexOf(app.applicationStatus);
              const stepIdx = statuses.indexOf(s);
              const done = currentIdx > stepIdx;
              const active = currentIdx === stepIdx;
              return (
                <div key={s} className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-650 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-450'}`}>{done ? '✓' : i + 1}</div>
                  <span className={`text-[11px] capitalize ${active ? 'font-bold text-indigo-650 dark:text-indigo-400' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{s.replace('_', ' ')}</span>
                </div>
              );
            })}
            {app.applicationStatus === 'rejected' && (
              <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-xs text-rose-700">
                <p className="font-bold">Rejected</p>
                <p className="mt-1 text-[10px]">{app.rejectionReason || 'No reason provided'}</p>
              </div>
            )}
          </CardWrapper>

          {app.approvedAmount && (
            <CardWrapper className="p-5 border-l-4 border-emerald-500">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-3">Approved Terms</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Approved Amount</span><span className="font-mono font-bold text-emerald-700">₹{app.approvedAmount?.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Approved Tenure</span><span className="font-mono font-bold">{app.approvedTenure} months</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Approved Date</span><span className="font-mono text-[10px]">{app.approvedAt ? new Date(app.approvedAt).toLocaleDateString('en-IN') : '—'}</span></div>
              </div>
              <button onClick={() => router.push('/dashboard/loans/disbursement')} className="mt-4 w-full py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">Proceed to Disbursement →</button>
            </CardWrapper>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Approve Application</h2>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Approved Amount (₹) *</label><input type="number" className={inputCls} value={approveForm.approvedAmount} onChange={(e) => setApproveForm(p => ({ ...p, approvedAmount: e.target.value }))} /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Approved Tenure (months) *</label><input type="number" className={inputCls} value={approveForm.approvedTenure} onChange={(e) => setApproveForm(p => ({ ...p, approvedTenure: e.target.value }))} /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Remarks</label><textarea className={`${inputCls} resize-none`} rows={2} value={approveForm.remarks} onChange={(e) => setApproveForm(p => ({ ...p, remarks: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setApproveModal(false)} className="flex-1 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">Cancel</button>
              <button onClick={() => action(`/api/loan-applications/${id}/approve`, 'POST', { approvedAmount: parseFloat(approveForm.approvedAmount), approvedTenure: parseInt(approveForm.approvedTenure), remarks: approveForm.remarks }, 'Application approved!')} disabled={submitting} className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer disabled:opacity-50">{submitting ? 'Processing...' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2"><XCircle className="w-5 h-5 text-rose-600" /> Reject Application</h2>
            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Rejection Reason *</label><textarea className={`${inputCls} resize-none mt-1.5`} rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Provide reason for rejection..." /></div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRejectModal(false)} className="flex-1 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">Cancel</button>
              <button onClick={() => action(`/api/loan-applications/${id}/reject`, 'POST', { rejectionReason: rejectReason }, 'Application rejected')} disabled={submitting || !rejectReason} className="flex-1 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer disabled:opacity-50">{submitting ? 'Processing...' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
