'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins, Plus, RefreshCcw, AlertTriangle, Search,
  ChevronDown, ChevronUp, Banknote, CalendarCheck
} from 'lucide-react';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  matured: 'bg-blue-50 text-blue-700 border-blue-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
  premature_closed: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function DDSAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memberId: '', schemeId: '', branchId: '', dailyAmount: 100, durationDays: 100 });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [collectForm, setCollectForm] = useState({ ddsAccountId: '', amount: '', paymentMode: 'CASH' });
  const [collecting, setCollecting] = useState(false);
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
      const res = await fetch(`/api/dds-accounts?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load DDS accounts');
      setAccounts(json.data || []);
      setPagination({ page: json.page || 1, pages: json.pages || 1, total: json.total || 0 });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, filterStatus, pagination.page]);

  const fetchMeta = useCallback(async () => {
    const [sr, mr, br] = await Promise.all([
      fetch('/api/deposit-schemes?limit=100').then(r => r.json()),
      fetch('/api/members?limit=100').then(r => r.json()),
      fetch('/api/branches?limit=50').then(r => r.json()),
    ]);
    setSchemes((sr.data || []).filter(s => s.schemeType === 'DDS'));
    setMembers(mr.data || []);
    setBranches(br.data || []);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const handleOpenAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/dds-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to open DDS account');
      setShowForm(false);
      fetchAccounts();
    } catch (e) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    setCollecting(true);
    setCollectError(null);
    setCollectSuccess(null);
    try {
      const res = await fetch('/api/dds-accounts/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Collection failed');
      setCollectSuccess(`Transaction ${json.data?.transactionNo || ''} created. Awaiting approval.`);
      setCollectForm({ ddsAccountId: '', amount: '', paymentMode: 'CASH' });
      fetchAccounts();
    } catch (e) { setCollectError(e.message); }
    finally { setCollecting(false); }
  };

  const InputClass = "w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const LabelClass = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Deposit Scheme Accounts"
        subtitle="Manage DDS accounts and post daily agent/counter collections"
        icon={Coins}
        action={
          <button onClick={() => { setShowForm(!showForm); setFormError(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all" id="btn-open-dds">
            <Plus className="w-4 h-4" /> Open DDS Account
          </button>
        }
      />

      {/* Daily Collection Panel */}
      <CardWrapper className="p-5 border-l-4 border-violet-500">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-violet-500" /> Post Daily Collection
        </h3>
        {collectError && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{collectError}</div>}
        {collectSuccess && <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">{collectSuccess}</div>}
        <form onSubmit={handleCollect} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={LabelClass}>DDS Account ID</label>
            <input className={InputClass} placeholder="DDS Account ObjectId" value={collectForm.ddsAccountId} onChange={e => setCollectForm({ ...collectForm, ddsAccountId: e.target.value })} required id="dds-collect-id" />
          </div>
          <div>
            <label className={LabelClass}>Collection Amount (₹)</label>
            <input type="number" min="1" className={InputClass} value={collectForm.amount} onChange={e => setCollectForm({ ...collectForm, amount: e.target.value })} required id="dds-collect-amount" />
          </div>
          <div>
            <label className={LabelClass}>Payment Mode</label>
            <select className={InputClass} value={collectForm.paymentMode} onChange={e => setCollectForm({ ...collectForm, paymentMode: e.target.value })} id="dds-collect-mode">
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={collecting} className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50" id="btn-post-dds-collection">
              {collecting ? 'Posting...' : 'Post Collection'}
            </button>
          </div>
        </form>
      </CardWrapper>

      {/* Open DDS Form */}
      {showForm && (
        <CardWrapper className="p-6 space-y-5 border-l-4 border-indigo-500">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-indigo-500" /> Open DDS Account
          </h3>
          {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{formError}</div>}
          <form onSubmit={handleOpenAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={LabelClass}>Member *</label>
                <select className={InputClass} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} required>
                  <option value="">Select Member</option>
                  {members.map(m => <option key={m._id} value={m._id}>{m.fullName} ({m.memberNo})</option>)}
                </select></div>
              <div><label className={LabelClass}>DDS Scheme *</label>
                <select className={InputClass} value={form.schemeId} onChange={e => setForm({ ...form, schemeId: e.target.value })} required>
                  <option value="">Select Scheme</option>
                  {schemes.map(s => <option key={s._id} value={s._id}>{s.schemeName} ({s.interestRate}%)</option>)}
                </select></div>
              <div><label className={LabelClass}>Branch *</label>
                <select className={InputClass} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} required>
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                </select></div>
              <div><label className={LabelClass}>Daily Amount (₹) *</label>
                <input type="number" min="50" className={InputClass} value={form.dailyAmount} onChange={e => setForm({ ...form, dailyAmount: parseFloat(e.target.value) })} required /></div>
              <div><label className={LabelClass}>Duration (Days) *</label>
                <input type="number" min="30" className={InputClass} value={form.durationDays} onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) })} required /></div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50" id="btn-submit-dds">
                {submitting ? 'Opening...' : 'Open Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
            </div>
          </form>
        </CardWrapper>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search DDS accounts..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" id="dds-search" />
        </div>
        {['', 'active', 'matured', 'closed'].map(s => (
          <button key={s || 'all'} onClick={() => setFilterStatus(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
        <button onClick={fetchAccounts} className="px-3 py-2 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"><RefreshCcw className="w-4 h-4" /></button>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600">{error}</div>
      ) : accounts.length === 0 ? (
        <CardWrapper className="py-24 text-center">
          <Coins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No DDS accounts found</p>
        </CardWrapper>
      ) : (
        <div className="space-y-3">
          {accounts.map(acct => {
            const isExpanded = expandedId === acct._id;
            const progress = acct.durationDays > 0 ? Math.min(100, Math.round(((acct.totalDeposit || 0) / ((acct.dailyAmount || 1) * acct.durationDays)) * 100)) : 0;
            return (
              <CardWrapper key={acct._id} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" onClick={() => setExpandedId(isExpanded ? null : acct._id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">{acct.ddsAccountNo}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusColors[acct.status] || 'bg-slate-100'}`}>{acct.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{acct.memberId?.fullName || 'N/A'} • ₹{acct.dailyAmount}/day • {acct.durationDays} days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-extrabold text-indigo-600">{formatCurrency(acct.maturityAmount)}</p>
                      <p className="text-[10px] text-slate-400">Maturity Amount</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(acct.totalDeposit || 0)}</p>
                      <p className="text-[10px] text-slate-400">Collected So Far</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                      {[
                        { label: 'Total Deposit Target', value: formatCurrency((acct.dailyAmount || 0) * (acct.durationDays || 0)) },
                        { label: 'Interest Amount', value: formatCurrency(acct.interestAmount) },
                        { label: 'Start Date', value: formatDate(acct.startDate) },
                        { label: 'Maturity Date', value: formatDate(acct.maturityDate) },
                        { label: 'Branch', value: acct.branchId?.branchName || 'N/A' },
                        { label: 'Scheme', value: acct.schemeId?.schemeName || 'N/A' },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Collection Progress</span>
                        <span className="text-[10px] font-bold text-violet-600">{progress}% collected</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    {acct.status === 'matured' && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Liquidate DDS Account ${acct.ddsAccountNo}?`)) return;
                          const r = await fetch('/api/deposit-maturity/liquidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct._id, accountType: 'DDS', paymentMode: 'CASH' }) });
                          const j = await r.json();
                          if (!r.ok) return alert(j.error?.message || 'Failed');
                          alert('Liquidation request submitted.'); fetchAccounts();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all mt-2"
                        id={`btn-dds-liquidate-${acct._id}`}
                      >Liquidate Matured Account</button>
                    )}
                  </div>
                )}
              </CardWrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
