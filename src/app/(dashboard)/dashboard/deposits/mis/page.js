'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PiggyBank, Plus, RefreshCcw, AlertTriangle, Search,
  ChevronDown, ChevronUp, DollarSign, CalendarCheck, Banknote
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

export default function MISAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memberId: '', schemeId: '', branchId: '', principalAmount: 200000, tenureMonths: 12, startDate: new Date().toISOString().slice(0, 10), fundingSource: 'CASH' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState({});
  const [payoutMsg, setPayoutMsg] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 10 });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/mis-accounts?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load MIS accounts');
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
    setSchemes((sr.data || []).filter(s => s.schemeType === 'MIS'));
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
      const res = await fetch('/api/mis-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to open MIS account');
      setShowForm(false);
      fetchAccounts();
    } catch (e) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const triggerPayout = async (acct) => {
    setPayoutLoading(prev => ({ ...prev, [acct._id]: true }));
    setPayoutMsg(prev => ({ ...prev, [acct._id]: null }));
    try {
      const res = await fetch(`/api/mis-accounts/${acct._id}/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ misAccountId: acct._id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Payout failed');
      setPayoutMsg(prev => ({ ...prev, [acct._id]: `Payout ${json.data?.transactionNo || ''} submitted for approval. Next payout: ${formatDate(json.data?.nextPayoutDate)}` }));
      fetchAccounts();
    } catch (e) {
      setPayoutMsg(prev => ({ ...prev, [acct._id]: `Error: ${e.message}` }));
    } finally {
      setPayoutLoading(prev => ({ ...prev, [acct._id]: false }));
    }
  };

  const InputClass = "w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const LabelClass = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Income Scheme Accounts"
        subtitle="Book MIS accounts, process monthly interest payouts to savings accounts"
        icon={PiggyBank}
        action={
          <button onClick={() => { setShowForm(!showForm); setFormError(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all" id="btn-open-mis">
            <Plus className="w-4 h-4" /> Open MIS Account
          </button>
        }
      />

      {/* Open MIS Form */}
      {showForm && (
        <CardWrapper className="p-6 space-y-5 border-l-4 border-amber-500">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-amber-500" /> Open Monthly Income Scheme
          </h3>
          {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{formError}</div>}
          <form onSubmit={handleOpenAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={LabelClass}>Member *</label>
                <select className={InputClass} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} required>
                  <option value="">Select Member</option>
                  {members.map(m => <option key={m._id} value={m._id}>{m.fullName} ({m.memberNo})</option>)}
                </select></div>
              <div><label className={LabelClass}>MIS Scheme *</label>
                <select className={InputClass} value={form.schemeId} onChange={e => setForm({ ...form, schemeId: e.target.value })} required>
                  <option value="">Select Scheme</option>
                  {schemes.map(s => <option key={s._id} value={s._id}>{s.schemeName} ({s.interestRate}%)</option>)}
                </select></div>
              <div><label className={LabelClass}>Branch *</label>
                <select className={InputClass} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} required>
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                </select></div>
              <div><label className={LabelClass}>Principal Amount (₹) *</label>
                <input type="number" min="10000" className={InputClass} value={form.principalAmount} onChange={e => setForm({ ...form, principalAmount: parseFloat(e.target.value) })} required /></div>
              <div><label className={LabelClass}>Tenure (Months) *</label>
                <input type="number" min="6" max="120" className={InputClass} value={form.tenureMonths} onChange={e => setForm({ ...form, tenureMonths: parseInt(e.target.value) })} required /></div>
              <div><label className={LabelClass}>Funding Source</label>
                <select className={InputClass} value={form.fundingSource} onChange={e => setForm({ ...form, fundingSource: e.target.value })}>
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Savings Transfer</option>
                </select></div>
              <div><label className={LabelClass}>Start Date</label>
                <input type="date" className={InputClass} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50" id="btn-submit-mis">
                {submitting ? 'Opening...' : 'Open MIS Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
            </div>
          </form>
        </CardWrapper>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search MIS accounts..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" id="mis-search" />
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
          <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No MIS accounts found</p>
        </CardWrapper>
      ) : (
        <div className="space-y-3">
          {accounts.map(acct => {
            const isExpanded = expandedId === acct._id;
            const isPayoutDue = acct.status === 'active' && acct.nextPayoutDate && new Date(acct.nextPayoutDate) <= new Date();
            return (
              <CardWrapper key={acct._id} className={`p-0 overflow-hidden ${isPayoutDue ? 'ring-2 ring-amber-400' : ''}`}>
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" onClick={() => setExpandedId(isExpanded ? null : acct._id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">{acct.misAccountNo}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusColors[acct.status] || 'bg-slate-100'}`}>{acct.status}</span>
                        {isPayoutDue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Payout Due</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{acct.memberId?.fullName || 'N/A'} • Principal {formatCurrency(acct.principalAmount)} • Monthly: {formatCurrency(acct.monthlyInterestAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-extrabold text-amber-600">{formatCurrency(acct.monthlyInterestAmount)}</p>
                      <p className="text-[10px] text-slate-400">Monthly Income</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(acct.nextPayoutDate)}</p>
                      <p className="text-[10px] text-slate-400">Next Payout</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                      {[
                        { label: 'Interest Rate', value: `${acct.interestRate}% p.a.` },
                        { label: 'Start Date', value: formatDate(acct.startDate) },
                        { label: 'Maturity Date', value: formatDate(acct.maturityDate) },
                        { label: 'Branch', value: acct.branchId?.branchName || 'N/A' },
                        { label: 'Scheme', value: acct.schemeId?.schemeName || 'N/A' },
                        { label: 'Next Payout', value: formatDate(acct.nextPayoutDate) },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {payoutMsg[acct._id] && (
                      <div className={`p-3 rounded-xl text-xs font-semibold mb-3 ${payoutMsg[acct._id].startsWith('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {payoutMsg[acct._id]}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {acct.status === 'active' && (
                        <button
                          onClick={() => triggerPayout(acct)}
                          disabled={payoutLoading[acct._id]}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                          id={`btn-mis-payout-${acct._id}`}
                        >
                          {payoutLoading[acct._id] ? 'Processing...' : 'Trigger Monthly Payout'}
                        </button>
                      )}
                      {(acct.status === 'matured' || acct.status === 'active') && (
                        <button
                          onClick={async () => {
                            const endpoint = acct.status === 'matured' ? '/api/deposit-maturity/liquidate' : '/api/deposit-closure/premature';
                            const body = acct.status === 'matured'
                              ? { accountId: acct._id, accountType: 'MIS', paymentMode: 'CASH' }
                              : { accountId: acct._id, accountType: 'MIS', paymentMode: 'CASH', remarks: 'Premature closure request' };
                            if (!confirm(`${acct.status === 'matured' ? 'Liquidate' : 'Premature close'} MIS Account ${acct.misAccountNo}?`)) return;
                            const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                            const j = await r.json();
                            if (!r.ok) return alert(j.error?.message || 'Failed');
                            alert('Request submitted for approval.'); fetchAccounts();
                          }}
                          className={`px-4 py-2 ${acct.status === 'matured' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-500 hover:bg-slate-600'} text-white text-xs font-bold rounded-xl transition-all`}
                          id={`btn-mis-close-${acct._id}`}
                        >
                          {acct.status === 'matured' ? 'Liquidate (Maturity)' : 'Request Premature Closure'}
                        </button>
                      )}
                    </div>
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
