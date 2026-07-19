'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock, Plus, RefreshCcw, AlertTriangle, Search,
  ChevronDown, ChevronUp, IndianRupee, Clock, CheckCircle2,
  XCircle, TrendingUp, Calendar, CreditCard, Banknote
} from 'lucide-react';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

export default function RDAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memberId: '', schemeId: '', branchId: '', monthlyInstallment: 1000, tenureMonths: 12, startDate: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [installments, setInstallments] = useState({});
  const [collectForm, setCollectForm] = useState({ rdAccountId: '', installmentNo: '', amount: '', paymentMode: 'CASH' });
  const [collectingId, setCollectingId] = useState(null);
  const [collectError, setCollectError] = useState(null);
  const [collectSuccess, setCollectSuccess] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 10 });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/rd-accounts?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load RD accounts');
      setAccounts(json.data || []);
      setPagination({ page: json.page, pages: json.pages, total: json.total });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, filterStatus, pagination.page]);

  const fetchMeta = useCallback(async () => {
    const [sr, mr, br] = await Promise.all([
      fetch('/api/deposit-schemes?limit=100').then(r => r.json()),
      fetch('/api/members?limit=100').then(r => r.json()),
      fetch('/api/branches?limit=50').then(r => r.json()),
    ]);
    setSchemes((sr.data || []).filter(s => s.schemeType === 'RD'));
    setMembers(mr.data || []);
    setBranches(br.data || []);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const fetchInstallments = async (rdAccountId) => {
    if (installments[rdAccountId]) return;
    const res = await fetch(`/api/rd-accounts/${rdAccountId}/installments`);
    const json = await res.json();
    if (res.ok) setInstallments(prev => ({ ...prev, [rdAccountId]: json.data || [] }));
  };

  const handleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchInstallments(id);
  };

  const handleOpenAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/rd-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to open RD account');
      setShowForm(false);
      setForm({ memberId: '', schemeId: '', branchId: '', monthlyInstallment: 1000, tenureMonths: 12, startDate: new Date().toISOString().slice(0, 10) });
      fetchAccounts();
    } catch (e) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    setCollectingId(collectForm.rdAccountId);
    setCollectError(null);
    setCollectSuccess(null);
    try {
      const res = await fetch('/api/rd-accounts/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Collection failed');
      setCollectSuccess(`Transaction ${json.data?.transactionNo || ''} created. Awaiting checker approval.`);
      setCollectForm({ rdAccountId: '', installmentNo: '', amount: '', paymentMode: 'CASH' });
      fetchAccounts();
    } catch (e) { setCollectError(e.message); }
    finally { setCollectingId(null); }
  };

  const InputClass = "w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const LabelClass = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";

  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    matured: 'bg-blue-50 text-blue-700 border-blue-200',
    closed: 'bg-slate-100 text-slate-500 border-slate-200',
    premature_closed: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Deposit Accounts"
        subtitle="Open accounts, collect installments, track schedules and manage RD maturities"
        icon={CalendarClock}
        action={
          <button onClick={() => { setShowForm(!showForm); setFormError(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all" id="btn-open-rd">
            <Plus className="w-4 h-4" /> Open RD Account
          </button>
        }
      />

      {/* Open RD Account Form */}
      {showForm && (
        <CardWrapper className="p-6 space-y-5 border-l-4 border-blue-500">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-500" /> Open New RD Account
          </h3>
          {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{formError}</div>}
          <form onSubmit={handleOpenAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={LabelClass}>Member *</label>
                <select className={InputClass} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} required id="rd-member">
                  <option value="">Select Member</option>
                  {members.map(m => <option key={m._id} value={m._id}>{m.fullName} ({m.memberNo})</option>)}
                </select>
              </div>
              <div>
                <label className={LabelClass}>RD Scheme *</label>
                <select className={InputClass} value={form.schemeId} onChange={e => setForm({ ...form, schemeId: e.target.value })} required id="rd-scheme">
                  <option value="">Select Scheme</option>
                  {schemes.map(s => <option key={s._id} value={s._id}>{s.schemeName} ({s.interestRate}% p.a.)</option>)}
                </select>
              </div>
              <div>
                <label className={LabelClass}>Branch *</label>
                <select className={InputClass} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} required id="rd-branch">
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                </select>
              </div>
              <div>
                <label className={LabelClass}>Monthly Installment (₹) *</label>
                <input type="number" min="100" className={InputClass} value={form.monthlyInstallment} onChange={e => setForm({ ...form, monthlyInstallment: parseFloat(e.target.value) })} required id="rd-installment" />
              </div>
              <div>
                <label className={LabelClass}>Tenure (Months) *</label>
                <input type="number" min="1" className={InputClass} value={form.tenureMonths} onChange={e => setForm({ ...form, tenureMonths: parseInt(e.target.value) })} required id="rd-tenure" />
              </div>
              <div>
                <label className={LabelClass}>Start Date</label>
                <input type="date" className={InputClass} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} id="rd-start-date" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50" id="btn-submit-rd">
                {submitting ? 'Opening...' : 'Open Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
            </div>
          </form>
        </CardWrapper>
      )}

      {/* Collect Installment Panel */}
      <CardWrapper className="p-5 border-l-4 border-emerald-500">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-emerald-500" /> Collect RD Installment
        </h3>
        {collectError && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{collectError}</div>}
        {collectSuccess && <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">{collectSuccess}</div>}
        <form onSubmit={handleCollect} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={LabelClass}>RD Account ID</label>
            <input className={InputClass} placeholder="RD Account ObjectId" value={collectForm.rdAccountId} onChange={e => setCollectForm({ ...collectForm, rdAccountId: e.target.value })} required id="collect-rd-id" />
          </div>
          <div>
            <label className={LabelClass}>Installment #</label>
            <input type="number" min="1" className={InputClass} value={collectForm.installmentNo} onChange={e => setCollectForm({ ...collectForm, installmentNo: e.target.value })} id="collect-inst-no" />
          </div>
          <div>
            <label className={LabelClass}>Amount (₹)</label>
            <input type="number" min="1" className={InputClass} value={collectForm.amount} onChange={e => setCollectForm({ ...collectForm, amount: e.target.value })} required id="collect-amount" />
          </div>
          <div>
            <label className={LabelClass}>Payment Mode</label>
            <select className={InputClass} value={collectForm.paymentMode} onChange={e => setCollectForm({ ...collectForm, paymentMode: e.target.value })} id="collect-mode">
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="RTGS">RTGS</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" disabled={!!collectingId} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50" id="btn-collect-rd">
              {collectingId ? 'Processing...' : 'Post Collection'}
            </button>
          </div>
        </form>
      </CardWrapper>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by RD No or member..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" id="rd-search" />
        </div>
        {['', 'active', 'matured', 'closed', 'premature_closed'].map(s => (
          <button key={s || 'all'} onClick={() => setFilterStatus(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : 'All'}
          </button>
        ))}
        <button onClick={fetchAccounts} className="px-3 py-2 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900" title="Refresh"><RefreshCcw className="w-4 h-4" /></button>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
      ) : accounts.length === 0 ? (
        <CardWrapper className="py-24 text-center">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No RD accounts found</p>
        </CardWrapper>
      ) : (
        <div className="space-y-3">
          {accounts.map(acct => {
            const isExpanded = expandedId === acct._id;
            const insts = installments[acct._id] || [];
            const paidCount = insts.filter(i => i.status === 'paid').length;
            const progress = acct.tenureMonths > 0 ? Math.min(100, Math.round((paidCount / acct.tenureMonths) * 100)) : 0;
            return (
              <CardWrapper key={acct._id} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" onClick={() => handleExpand(acct._id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">{acct.rdAccountNo}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusColors[acct.status] || 'bg-slate-100'}`}>{acct.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {acct.memberId?.fullName || 'N/A'} • ₹{acct.monthlyInstallment?.toLocaleString()}/mo • {acct.tenureMonths} months
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-extrabold text-indigo-600">{formatCurrency(acct.maturityAmount)}</p>
                      <p className="text-[10px] text-slate-400">Maturity Amount</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(acct.maturityDate)}</p>
                      <p className="text-[10px] text-slate-400">Matures On</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                      {[
                        { label: 'Interest Rate', value: `${acct.interestRate}% p.a.` },
                        { label: 'Principal Deposited', value: formatCurrency(acct.totalDepositAmount) },
                        { label: 'Total Interest', value: formatCurrency(acct.totalInterest) },
                        { label: 'Start Date', value: formatDate(acct.startDate) },
                        { label: 'Next Installment', value: formatDate(acct.nextInstallmentDate) },
                        { label: 'Branch', value: acct.branchId?.branchName || 'N/A' },
                        { label: 'Scheme', value: acct.schemeId?.schemeName || 'N/A' },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Installments Progress</span>
                        <span className="text-[10px] font-bold text-indigo-600">{paidCount}/{acct.tenureMonths} paid ({progress}%)</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Installments Schedule */}
                    {insts.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Installment Schedule</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                {['#', 'Due Date', 'Amount', 'Paid Date', 'Status'].map(h => (
                                  <th key={h} className="text-left py-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {insts.slice(0, 12).map(inst => (
                                <tr key={inst._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800">
                                  <td className="py-2 px-2 font-mono font-bold text-slate-700 dark:text-slate-300">{inst.installmentNo}</td>
                                  <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{formatDate(inst.dueDate)}</td>
                                  <td className="py-2 px-2 font-bold">{formatCurrency(inst.amount)}</td>
                                  <td className="py-2 px-2 text-slate-500">{formatDate(inst.paidDate)}</td>
                                  <td className="py-2 px-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inst.status === 'late' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                      {inst.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {insts.length > 12 && <p className="text-[10px] text-slate-400 mt-2 text-right">Showing 12 of {insts.length} installments</p>}
                        </div>
                      </div>
                    )}

                    {/* Liquidate Action */}
                    {acct.status === 'matured' && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                        <button
                          onClick={async () => {
                            if (!confirm(`Liquidate RD Account ${acct.rdAccountNo}?`)) return;
                            try {
                              const r = await fetch('/api/deposit-maturity/liquidate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ accountId: acct._id, accountType: 'RD', paymentMode: 'CASH' }),
                              });
                              const j = await r.json();
                              if (!r.ok) throw new Error(j.error?.message || 'Liquidation failed');
                              alert('Liquidation request submitted for approval.');
                              fetchAccounts();
                            } catch (e) { alert(e.message); }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                          id={`btn-liquidate-${acct._id}`}
                        >
                          Liquidate (Maturity Payout)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardWrapper>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-50">Prev</button>
          <span className="px-3 py-1.5 text-xs font-bold text-slate-500">Page {pagination.page} of {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}
    </div>
  );
}
