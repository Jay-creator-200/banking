'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, ToggleLeft, ToggleRight, Edit2, Eye, Percent, Shield } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';

const EMPTY_FORM = {
  productCode: '', productName: '', description: '',
  interestType: 'reducing', interestRate: '', penaltyRate: 0,
  penaltyType: 'daily_percentage', processingFeeType: 'percentage',
  processingFeeValue: 0, minimumAmount: '', maximumAmount: '',
  minimumTenure: 6, maximumTenure: 60,
  requiresGuarantor: false, requiresCollateral: false, approvalLevels: 1,
};

const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{label}</label>
    {children}
  </div>
);

export default function LoanProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loan-products?page=${page}&limit=15`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data?.docs || []);
        setTotal(json.data?.meta?.total || 0);
        setTotalPages(json.data?.meta?.pages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditProduct(null); setError(''); setShowModal(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditProduct(p); setError(''); setShowModal(true); };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const url = editProduct ? `/api/loan-products/${editProduct._id}` : '/api/loan-products';
      const method = editProduct ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (res.ok) { setShowModal(false); fetchProducts(); }
      else setError(json.error?.message || 'Failed to save product');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id) => {
    await fetch(`/api/loan-products/${id}`, { method: 'PATCH' });
    fetchProducts();
  };

  const columns = [
    { header: 'Code', accessor: 'productCode', cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-lg">{value}</span> },
    { header: 'Product Name', accessor: 'productName', cell: ({ value }) => <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{value}</span> },
    { header: 'Interest Type', accessor: 'interestType', cell: ({ value }) => <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${value === 'reducing' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700'}`}>{value}</span> },
    { header: 'Rate % p.a.', accessor: 'interestRate', cell: ({ value }) => <span className="font-mono font-bold text-xs text-indigo-650">{value}%</span> },
    { header: 'Penalty %', accessor: 'penaltyRate', cell: ({ value }) => <span className="font-mono text-xs text-rose-600">{value}%</span> },
    { header: 'Amount Range (₹)', cell: ({ row }) => <span className="font-mono text-[10px] text-slate-500">₹{row.minimumAmount?.toLocaleString('en-IN')} — ₹{row.maximumAmount?.toLocaleString('en-IN')}</span> },
    { header: 'Tenure', cell: ({ row }) => <span className="text-[10px] text-slate-500">{row.minimumTenure}–{row.maximumTenure} mo</span> },
    { header: 'Status', accessor: 'isActive', cell: ({ value }) => <StatusBadge status={value ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      header: 'Actions', cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-500 cursor-pointer border border-slate-200 dark:border-slate-800"><Edit2 className="w-3 h-3" /></button>
          <button onClick={() => handleToggle(row._id)} className={`p-1.5 rounded-lg cursor-pointer border ${row.isActive ? 'text-emerald-600 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50' : 'text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}>
            {row.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Products"
        subtitle="Configure loan product templates with interest rates, tenure limits, and eligibility rules."
        breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Products', href: '#' }]}
        action={
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm">
            <Plus className="w-4 h-4" /> New Product
          </button>
        }
      />

      <CardWrapper className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{total} Products Configured</p>
          <button onClick={fetchProducts} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-500">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <DataTable columns={columns} data={products} loading={loading} />
        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-slate-450">Showing {products.length} of {total}</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </CardWrapper>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-650 flex items-center justify-center"><Percent className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{editProduct ? 'Edit' : 'New'} Loan Product</h2>
                  <p className="text-[11px] text-slate-450">Noble Cooperative Bank — Loan Product Master</p>
                </div>
              </div>

              {error && <div className="mb-4 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Product Code *"><input className={inputCls} value={form.productCode} onChange={(e) => setForm(p => ({ ...p, productCode: e.target.value.toUpperCase() }))} placeholder="e.g. HL001" /></Field>
                <Field label="Product Name *"><input className={inputCls} value={form.productName} onChange={(e) => setForm(p => ({ ...p, productName: e.target.value }))} placeholder="Home Loan" /></Field>
                <Field label="Interest Type *">
                  <select className={inputCls} value={form.interestType} onChange={(e) => setForm(p => ({ ...p, interestType: e.target.value }))}>
                    <option value="reducing">Reducing Balance</option>
                    <option value="flat">Flat Rate</option>
                  </select>
                </Field>
                <Field label="Interest Rate % p.a. *"><input type="number" className={inputCls} value={form.interestRate} onChange={(e) => setForm(p => ({ ...p, interestRate: parseFloat(e.target.value) || '' }))} placeholder="12.5" /></Field>
                <Field label="Penalty Type">
                  <select className={inputCls} value={form.penaltyType} onChange={(e) => setForm(p => ({ ...p, penaltyType: e.target.value }))}>
                    <option value="daily_percentage">Daily %</option>
                    <option value="monthly_percentage">Monthly %</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="none">None</option>
                  </select>
                </Field>
                <Field label="Penalty Rate / Amount"><input type="number" className={inputCls} value={form.penaltyRate} onChange={(e) => setForm(p => ({ ...p, penaltyRate: parseFloat(e.target.value) || 0 }))} placeholder="0.05" /></Field>
                <Field label="Processing Fee Type">
                  <select className={inputCls} value={form.processingFeeType} onChange={(e) => setForm(p => ({ ...p, processingFeeType: e.target.value }))}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </Field>
                <Field label="Processing Fee Value"><input type="number" className={inputCls} value={form.processingFeeValue} onChange={(e) => setForm(p => ({ ...p, processingFeeValue: parseFloat(e.target.value) || 0 }))} placeholder="1" /></Field>
                <Field label="Min Amount (₹) *"><input type="number" className={inputCls} value={form.minimumAmount} onChange={(e) => setForm(p => ({ ...p, minimumAmount: parseFloat(e.target.value) || '' }))} placeholder="10000" /></Field>
                <Field label="Max Amount (₹) *"><input type="number" className={inputCls} value={form.maximumAmount} onChange={(e) => setForm(p => ({ ...p, maximumAmount: parseFloat(e.target.value) || '' }))} placeholder="1000000" /></Field>
                <Field label="Min Tenure (months)"><input type="number" className={inputCls} value={form.minimumTenure} onChange={(e) => setForm(p => ({ ...p, minimumTenure: parseInt(e.target.value) || 1 }))} /></Field>
                <Field label="Max Tenure (months)"><input type="number" className={inputCls} value={form.maximumTenure} onChange={(e) => setForm(p => ({ ...p, maximumTenure: parseInt(e.target.value) || 1 }))} /></Field>
                <Field label="Approval Levels"><input type="number" min={1} max={3} className={inputCls} value={form.approvalLevels} onChange={(e) => setForm(p => ({ ...p, approvalLevels: parseInt(e.target.value) || 1 }))} /></Field>
                <div className="col-span-2">
                  <Field label="Description"><textarea className={`${inputCls} resize-none`} rows={2} value={form.description || ''} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} /></Field>
                </div>
                <div className="col-span-2 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.requiresGuarantor} onChange={(e) => setForm(p => ({ ...p, requiresGuarantor: e.target.checked }))} className="rounded" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Requires Guarantor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.requiresCollateral} onChange={(e) => setForm(p => ({ ...p, requiresCollateral: e.target.checked }))} className="rounded" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Requires Collateral</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50">{submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Create Product'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
