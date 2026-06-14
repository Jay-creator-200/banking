'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Building2, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function NewLoanApplicationPage() {
  const router = useRouter();

  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({
    memberId: '', branchId: '', loanProductId: '',
    requestedAmount: '', requestedTenureMonths: '', purpose: '', remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Read memberId query parameter if present on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const memberIdParam = params.get('memberId');
      if (memberIdParam) {
        setForm((prev) => ({ ...prev, memberId: memberIdParam }));
      }
    }
  }, []);

  // Auto-resolve branch when member is selected
  useEffect(() => {
    if (form.memberId && members.length > 0) {
      const selectedMember = members.find((m) => m._id === form.memberId);
      if (selectedMember && selectedMember.branchId) {
        const bId = selectedMember.branchId._id || selectedMember.branchId;
        if (bId) {
          setForm((prev) => ({ ...prev, branchId: bId.toString() }));
        }
      }
    }
  }, [form.memberId, members]);

  useEffect(() => {
    async function loadData() {
      const [mRes, bRes, pRes] = await Promise.all([
        fetch('/api/members?limit=200&status=active'),
        fetch('/api/branches?limit=100'),
        fetch('/api/loan-products?isActive=true&limit=100'),
      ]);
      if (mRes.ok) { const j = await mRes.json(); setMembers(j.data?.docs || j.data || []); }
      if (bRes.ok) { const j = await bRes.json(); setBranches(j.data || []); }
      if (pRes.ok) { const j = await pRes.json(); setProducts(j.data?.docs || []); }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (form.loanProductId) {
      const p = products.find((x) => x._id === form.loanProductId);
      setSelectedProduct(p || null);
    } else {
      setSelectedProduct(null);
    }
  }, [form.loanProductId, products]);

  const handleSubmit = async (isDraft) => {
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/loan-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, requestedAmount: parseFloat(form.requestedAmount), requestedTenureMonths: parseInt(form.requestedTenureMonths) }),
      });
      const json = await res.json();
      if (res.ok) {
        const appId = json.data?._id;
        if (!isDraft && appId) {
          await fetch(`/api/loan-applications/${appId}/submit`, { method: 'POST' });
        }
        setSuccess('Application created! Redirecting...');
        setTimeout(() => router.push('/dashboard/loans/applications'), 1200);
      } else {
        setError(json.error?.message || 'Failed to create application');
      }
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';
  const Field = ({ label, children, span }) => (
    <div className={span ? `col-span-${span}` : ''}>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );

  // EMI Preview
  let emiPreview = null;
  if (selectedProduct && form.requestedAmount && form.requestedTenureMonths) {
    const P = parseFloat(form.requestedAmount);
    const N = parseInt(form.requestedTenureMonths);
    const R = selectedProduct.interestRate;
    if (selectedProduct.interestType === 'flat') {
      const totalInt = (P * R * (N / 12)) / 100;
      const emi = (P + totalInt) / N;
      emiPreview = { emi: Math.round(emi * 100) / 100, totalInterest: Math.round(totalInt * 100) / 100, totalPayable: Math.round((P + totalInt) * 100) / 100 };
    } else {
      const mr = R / (12 * 100);
      const factor = Math.pow(1 + mr, N);
      const emi = mr === 0 ? P / N : (P * mr * factor) / (factor - 1);
      const totalPayable = emi * N;
      emiPreview = { emi: Math.round(emi * 100) / 100, totalInterest: Math.round((totalPayable - P) * 100) / 100, totalPayable: Math.round(totalPayable * 100) / 100 };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer text-slate-650">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="New Loan Application"
          subtitle="Submit a fresh loan application for a cooperative bank member."
          breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Applications', href: '/dashboard/loans/applications' }, { label: 'New', href: '#' }]}
        />
      </div>

      {error && <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 text-xs font-semibold"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <CardWrapper className="p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Application Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Member *">
                <select className={inputCls} value={form.memberId} onChange={(e) => setForm(p => ({ ...p, memberId: e.target.value }))}>
                  <option value="">Select member...</option>
                  {members.map((m) => <option key={m._id} value={m._id}>{m.fullName} ({m.memberNo})</option>)}
                </select>
              </Field>
              <Field label="Branch *">
                <select className={inputCls} value={form.branchId} onChange={(e) => setForm(p => ({ ...p, branchId: e.target.value }))}>
                  <option value="">Select branch...</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Loan Product *">
                  <select className={inputCls} value={form.loanProductId} onChange={(e) => setForm(p => ({ ...p, loanProductId: e.target.value }))}>
                    <option value="">Select loan product...</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.productName} ({p.interestRate}% {p.interestType})</option>)}
                  </select>
                </Field>
              </div>
              {selectedProduct && (
                <div className="col-span-2 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-400 grid grid-cols-4 gap-2">
                  <div><p className="text-[9px] font-bold uppercase text-indigo-400">Min Amount</p><p className="font-bold font-mono">₹{selectedProduct.minimumAmount?.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[9px] font-bold uppercase text-indigo-400">Max Amount</p><p className="font-bold font-mono">₹{selectedProduct.maximumAmount?.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[9px] font-bold uppercase text-indigo-400">Min Tenure</p><p className="font-bold font-mono">{selectedProduct.minimumTenure} mo</p></div>
                  <div><p className="text-[9px] font-bold uppercase text-indigo-400">Max Tenure</p><p className="font-bold font-mono">{selectedProduct.maximumTenure} mo</p></div>
                </div>
              )}
              <Field label="Requested Amount (₹) *"><input type="number" className={inputCls} value={form.requestedAmount} onChange={(e) => setForm(p => ({ ...p, requestedAmount: e.target.value }))} placeholder="100000" /></Field>
              <Field label="Requested Tenure (months) *"><input type="number" className={inputCls} value={form.requestedTenureMonths} onChange={(e) => setForm(p => ({ ...p, requestedTenureMonths: e.target.value }))} placeholder="24" /></Field>
              <div className="col-span-2">
                <Field label="Purpose of Loan">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.purpose} onChange={(e) => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Home renovation, business expansion, education..." />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Remarks">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} placeholder="Additional notes..." />
                </Field>
              </div>
            </div>
          </CardWrapper>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          {/* EMI Preview */}
          {emiPreview && (
            <CardWrapper className="p-5 border-l-4 border-indigo-500">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">EMI Preview</h4>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-[10px] text-slate-500">Monthly EMI</span><span className="font-mono font-bold text-indigo-650 dark:text-indigo-400">₹{emiPreview.emi.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-slate-500">Total Interest</span><span className="font-mono text-xs text-amber-600">₹{emiPreview.totalInterest.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2"><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Total Payable</span><span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">₹{emiPreview.totalPayable.toLocaleString('en-IN')}</span></div>
              </div>
              <p className="text-[9px] text-slate-400 mt-3">* Indicative estimate. Actual may vary.</p>
            </CardWrapper>
          )}

          {selectedProduct && (
            <CardWrapper className="p-5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Product Rules</h4>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="text-slate-500">Requires Guarantor</span><span className={`font-bold ${selectedProduct.requiresGuarantor ? 'text-amber-600' : 'text-slate-400'}`}>{selectedProduct.requiresGuarantor ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Requires Collateral</span><span className={`font-bold ${selectedProduct.requiresCollateral ? 'text-amber-600' : 'text-slate-400'}`}>{selectedProduct.requiresCollateral ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Processing Fee</span><span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedProduct.processingFeeType === 'percentage' ? `${selectedProduct.processingFeeValue}%` : `₹${selectedProduct.processingFeeValue}`}</span></div>
              </div>
            </CardWrapper>
          )}

          <CardWrapper className="p-5 space-y-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting || !form.memberId || !form.loanProductId}
              className="w-full px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting || !form.memberId || !form.loanProductId || !form.requestedAmount || !form.requestedTenureMonths}
              className="w-full px-4 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
