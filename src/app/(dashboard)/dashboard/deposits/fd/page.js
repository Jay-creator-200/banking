'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Plus, RefreshCcw, AlertTriangle, Search,
  ChevronDown, ChevronUp, Calculator, IndianRupee, CheckCircle2
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

export default function FDAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memberId: '', schemeId: '', branchId: '', principalAmount: 50000, tenureMonths: 12, paymentMode: 'maturity', startDate: new Date().toISOString().slice(0, 10), fundingSource: 'CASH' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [calculator, setCalculator] = useState({ principal: 50000, rate: 8, tenure: 12, type: 'compound' });
  const [calcResult, setCalcResult] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 10 });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/fd-accounts?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load FD accounts');
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
    setSchemes((sr.data || []).filter(s => s.schemeType === 'FD'));
    setMembers(mr.data || []);
    setBranches(br.data || []);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const runCalculator = async () => {
    try {
      const res = await fetch('/api/deposit-interest/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...calculator, schemeType: 'FD', compoundingFreq: 'monthly' }),
      });
      const json = await res.json();
      if (res.ok) setCalcResult(json.data);
    } catch { /* ignore */ }
  };

  const handleOpenAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/fd-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to open FD account');
      setShowForm(false);
      fetchAccounts();
    } catch (e) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const InputClass = "w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const LabelClass = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixed Deposit Accounts"
        subtitle="Book FD accounts, compute returns, and manage maturity renewals or liquidations"
        icon={TrendingUp}
        action={
          <button onClick={() => { setShowForm(!showForm); setFormError(null); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all" id="btn-open-fd">
            <Plus className="w-4 h-4" /> Book FD Account
          </button>
        }
      />

      {/* FD Calculator */}
      <CardWrapper className="p-5 border-l-4 border-emerald-500">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-emerald-500" /> FD Return Calculator
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={LabelClass}>Principal (₹)</label>
            <input type="number" className={InputClass} value={calculator.principal} onChange={e => setCalculator({ ...calculator, principal: parseFloat(e.target.value) })} />
          </div>
          <div>
            <label className={LabelClass}>Rate (% p.a.)</label>
            <input type="number" step="0.01" className={InputClass} value={calculator.rate} onChange={e => setCalculator({ ...calculator, rate: parseFloat(e.target.value) })} />
          </div>
          <div>
            <label className={LabelClass}>Tenure (months)</label>
            <input type="number" className={InputClass} value={calculator.tenure} onChange={e => setCalculator({ ...calculator, tenure: parseInt(e.target.value) })} />
          </div>
          <div>
            <label className={LabelClass}>Interest Type</label>
            <select className={InputClass} value={calculator.type} onChange={e => setCalculator({ ...calculator, type: e.target.value })}>
              <option value="simple">Simple</option>
              <option value="compound">Compound</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <button onClick={runCalculator} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all" id="btn-calc">Calculate</button>
          {calcResult && (
            <div className="flex gap-6 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Interest: <span className="text-emerald-600">{formatCurrency(calcResult.totalInterest)}</span></span>
              <span className="font-bold text-slate-700 dark:text-slate-300">Maturity: <span className="text-indigo-600">{formatCurrency(calcResult.maturityAmount)}</span></span>
            </div>
          )}
        </div>
      </CardWrapper>

      {/* Open FD Form */}
      {showForm && (
        <CardWrapper className="p-6 space-y-5 border-l-4 border-indigo-500">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Book Fixed Deposit
          </h3>
          {formError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{formError}</div>}
          <form onSubmit={handleOpenAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={LabelClass}>Member *</label>
                <select className={InputClass} value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} required>
                  <option value="">Select Member</option>
                  {members.map(m => <option key={m._id} value={m._id}>{m.fullName} ({m.memberNo})</option>)}
                </select></div>
              <div><label className={LabelClass}>FD Scheme *</label>
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
                <input type="number" min="1000" className={InputClass} value={form.principalAmount} onChange={e => setForm({ ...form, principalAmount: parseFloat(e.target.value) })} required /></div>
              <div><label className={LabelClass}>Tenure (Months) *</label>
                <input type="number" min="1" className={InputClass} value={form.tenureMonths} onChange={e => setForm({ ...form, tenureMonths: parseInt(e.target.value) })} required /></div>
              <div><label className={LabelClass}>Interest Payout</label>
                <select className={InputClass} value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                  <option value="maturity">At Maturity</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select></div>
              <div><label className={LabelClass}>Funding Source</label>
                <select className={InputClass} value={form.fundingSource} onChange={e => setForm({ ...form, fundingSource: e.target.value })}>
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Savings Transfer</option>
                </select></div>
              <div><label className={LabelClass}>Start Date</label>
                <input type="date" className={InputClass} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50" id="btn-submit-fd">
                {submitting ? 'Booking...' : 'Book FD Account'}
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
          <input type="text" placeholder="Search by FD No or member..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" id="fd-search" />
        </div>
        {['', 'active', 'matured', 'closed'].map(s => (
          <button key={s || 'all'} onClick={() => setFilterStatus(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
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
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No FD accounts found</p>
        </CardWrapper>
      ) : (
        <div className="space-y-3">
          {accounts.map(acct => {
            const isExpanded = expandedId === acct._id;
            return (
              <CardWrapper key={acct._id} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all" onClick={() => setExpandedId(isExpanded ? null : acct._id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">{acct.fdAccountNo}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusColors[acct.status] || 'bg-slate-100'}`}>{acct.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{acct.memberId?.fullName || 'N/A'} • Principal {formatCurrency(acct.principalAmount)} • {acct.tenureMonths} months</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-extrabold text-indigo-600">{formatCurrency(acct.maturityAmount)}</p>
                      <p className="text-[10px] text-slate-400">Maturity Amount</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(acct.maturityDate)}</p>
                      <p className="text-[10px] text-slate-400">Matures</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                      {[
                        { label: 'Interest Rate', value: `${acct.interestRate}% p.a.` },
                        { label: 'Interest Amount', value: formatCurrency(acct.interestAmount) },
                        { label: 'Payout Mode', value: acct.paymentMode || 'maturity' },
                        { label: 'Start Date', value: formatDate(acct.startDate) },
                        { label: 'Branch', value: acct.branchId?.branchName || 'N/A' },
                        { label: 'Scheme', value: acct.schemeId?.schemeName || 'N/A' },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    {acct.status === 'matured' && (
                      <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={async () => {
                            if (!confirm(`Liquidate FD Account ${acct.fdAccountNo}?`)) return;
                            const r = await fetch('/api/deposit-maturity/liquidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct._id, accountType: 'FD', paymentMode: 'CASH' }) });
                            const j = await r.json();
                            if (!r.ok) return alert(j.error?.message || 'Failed');
                            alert('Liquidation request submitted.'); fetchAccounts();
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                          id={`btn-fd-liquidate-${acct._id}`}
                        >Liquidate (Maturity)</button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Close FD Account ${acct.fdAccountNo} prematurely?`)) return;
                            const r = await fetch('/api/deposit-closure/premature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct._id, accountType: 'FD', paymentMode: 'CASH', remarks: 'Premature closure request' }) });
                            const j = await r.json();
                            if (!r.ok) return alert(j.error?.message || 'Failed');
                            alert('Premature closure submitted for approval.'); fetchAccounts();
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl"
                          id={`btn-fd-premature-${acct._id}`}
                        >Premature Closure</button>
                      </div>
                    )}
                    {acct.status === 'active' && (
                      <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={async () => {
                            if (!confirm(`Request premature closure for FD Account ${acct.fdAccountNo}?`)) return;
                            const r = await fetch('/api/deposit-closure/premature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: acct._id, accountType: 'FD', paymentMode: 'CASH', remarks: 'Premature closure requested by member' }) });
                            const j = await r.json();
                            if (!r.ok) return alert(j.error?.message || 'Failed');
                            alert('Premature closure submitted for approval.'); fetchAccounts();
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl"
                          id={`btn-fd-premature-active-${acct._id}`}
                        >Request Premature Closure</button>
                      </div>
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
