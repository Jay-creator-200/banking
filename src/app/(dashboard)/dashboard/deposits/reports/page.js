'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, RefreshCcw, CalendarClock, TrendingUp, Coins,
  PiggyBank, DollarSign, Users, AlertTriangle, LibraryBig,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const StatCard = ({ title, value, sub, icon: Icon, iconColor, trend }) => (
  <CardWrapper className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{value}</p>
        {sub && <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(trend)}% vs last month
      </div>
    )}
  </CardWrapper>
);

export default function DepositReportsPage() {
  const [summary, setSummary] = useState(null);
  const [activeDeposits, setActiveDeposits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const params = selectedBranch ? `?branchId=${selectedBranch}` : '';
      const res = await fetch(`/api/deposit-reports/summary${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load summary');
      setSummary(json.data);
    } catch (e) { setError(e.message); }
    finally { setLoadingSummary(false); }
  }, [selectedBranch]);

  const fetchActiveDeposits = useCallback(async () => {
    setLoadingActive(true);
    try {
      const params = selectedBranch ? `?branchId=${selectedBranch}` : '';
      const res = await fetch(`/api/deposit-reports/active${params}`);
      const json = await res.json();
      if (res.ok) setActiveDeposits(json.data || []);
    } catch { /* ignore */ }
    finally { setLoadingActive(false); }
  }, [selectedBranch]);

  const fetchBranches = useCallback(async () => {
    const res = await fetch('/api/branches?limit=50');
    const json = await res.json();
    if (res.ok) setBranches(json.data || []);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => {
    fetchSummary();
    fetchActiveDeposits();
  }, [fetchSummary, fetchActiveDeposits]);

  const typeIcons = { RD: CalendarClock, FD: TrendingUp, DDS: Coins, MIS: PiggyBank };
  const typeColors = {
    RD: 'bg-blue-50 text-blue-600',
    FD: 'bg-emerald-50 text-emerald-600',
    DDS: 'bg-violet-50 text-violet-600',
    MIS: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposit Portfolio Reports"
        subtitle="Consolidated overview of all deposit scheme portfolios across branches"
        icon={BarChart3}
        action={
          <div className="flex gap-3">
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              id="report-branch-filter"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.branchName}</option>)}
            </select>
            <button
              onClick={() => { fetchSummary(); fetchActiveDeposits(); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
              id="btn-refresh-reports"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Deposit Portfolio" value={formatCurrency(summary.totalPortfolio)} sub="Across all scheme types" icon={DollarSign} iconColor="bg-indigo-50 text-indigo-600" />
            <StatCard title="Active Accounts" value={(summary.totalActiveAccounts || 0).toLocaleString()} sub="RD + FD + DDS + MIS" icon={Users} iconColor="bg-emerald-50 text-emerald-600" />
            <StatCard title="Monthly Interest Obligation" value={formatCurrency(summary.monthlyInterestObligation)} sub="MIS payouts due this month" icon={CalendarClock} iconColor="bg-amber-50 text-amber-600" />
            <StatCard title="Maturing This Month" value={(summary.maturingThisMonth || 0).toLocaleString()} sub="Accounts maturing" icon={AlertTriangle} iconColor="bg-rose-50 text-rose-600" />
          </div>

          {/* Per-Scheme Type Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['RD', 'FD', 'DDS', 'MIS'].map(type => {
              const Icon = typeIcons[type];
              const data = summary[type.toLowerCase()] || {};
              return (
                <CardWrapper key={type} className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeColors[type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">{type}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{(data.activeCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Portfolio</span>
                      <span className="text-xs font-bold text-indigo-600">{formatCurrency(data.totalPortfolio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Matured</span>
                      <span className="text-xs font-bold text-blue-600">{(data.maturedCount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Closed</span>
                      <span className="text-xs font-semibold text-slate-500">{(data.closedCount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </CardWrapper>
              );
            })}
          </div>
        </>
      )}

      {/* Active Deposits Tab */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          {[
            { id: 'summary', label: 'Portfolio Overview' },
            { id: 'active', label: 'Active Accounts List' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'active' && (
        <>
          {loadingActive ? (
            <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
          ) : activeDeposits.length === 0 ? (
            <CardWrapper className="py-20 text-center">
              <LibraryBig className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No active deposit accounts found</p>
            </CardWrapper>
          ) : (
            <CardWrapper className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      {['Account No', 'Type', 'Member', 'Principal / Daily Amt', 'Interest Rate', 'Maturity Amount', 'Maturity Date', 'Status'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDeposits.map((acct, idx) => {
                      const Icon = typeIcons[acct.schemeType] || BarChart3;
                      const colorClass = typeColors[acct.schemeType] || 'bg-slate-50 text-slate-600';
                      return (
                        <tr key={`${acct._id}-${idx}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">{acct.accountNo}</td>
                          <td className="py-3 px-4">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${colorClass}`}>
                              <Icon className="w-3 h-3" />{acct.schemeType}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{acct.memberName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(acct.principalOrDailyAmount)}</td>
                          <td className="py-3 px-4 font-bold text-indigo-600">{acct.interestRate}%</td>
                          <td className="py-3 px-4 font-bold text-emerald-600">{formatCurrency(acct.maturityAmount)}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(acct.maturityDate)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${acct.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : acct.status === 'matured' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {acct.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold">
                Showing {activeDeposits.length} accounts
              </div>
            </CardWrapper>
          )}
        </>
      )}
    </div>
  );
}
