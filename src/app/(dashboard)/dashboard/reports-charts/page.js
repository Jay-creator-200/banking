'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2, DollarSign, Wallet, Landmark, Activity } from 'lucide-react';

export default function ReportsChartsPage() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Load branches
  useEffect(() => {
    fetch('/api/branches?limit=100')
      .then(res => res.ok && res.json())
      .then(json => {
        if (json && json.data.length > 0) {
          setBranches(json.data);
          setSelectedBranch(json.data[0]._id);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch Dashboard Stats & Chart Series
  const fetchDashboardStats = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/advanced-stats?branchId=${selectedBranch}`);
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting BI & Performance"
        subtitle="Cooperative banking financial trends, growth, collections, and cash metrics."
      >
        <button
          onClick={fetchDashboardStats}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Stats
        </button>
      </PageHeader>

      {/* Select branch */}
      <CardWrapper className="p-4 flex items-center gap-3 print:hidden">
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 focus:outline-none min-w-[200px]"
        >
          {branches.map(b => (
            <option key={b._id} value={b._id}>{b.branchName}</option>
          ))}
        </select>
      </CardWrapper>

      {loading ? (
        <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : dashboardData ? (
        <div className="space-y-6">
          
          {/* Widgets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Widget 1: Today's Collection */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Collections</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.todayCollection.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg shrink-0">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 2: Today's Withdrawal */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Withdrawals</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.todayWithdrawal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg shrink-0">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 3: Loan Outstanding */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loan Outstanding</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.loanOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-lg shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 4: Deposit Liability */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposit Liability</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.depositLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 5: Interest Income */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periodic Interest Income</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.interestIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-lg shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 6: Interest Expense */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periodic Interest Expense</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.interestExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 7: Net Profit */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accumulated Net Profit</span>
                  <h3 className={`text-lg font-extrabold mt-1 ${dashboardData.stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    ₹{dashboardData.stats.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-lg shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

            {/* Widget 8: Cash Position */}
            <CardWrapper className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Position (Vault)</span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    ₹{dashboardData.stats.cashPosition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded-lg shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </CardWrapper>

          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Deposit Growth (Line Chart) */}
            <CardWrapper className="p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Deposit Growth Trend</h4>
              <div className="h-64 flex items-end justify-between relative px-2 pt-6">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  {/* Gradient Fill */}
                  <defs>
                    <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 100 L 0 ${100 - (dashboardData.charts.depositGrowth[0] / dashboardData.stats.depositLiability * 80)} L 20 ${100 - (dashboardData.charts.depositGrowth[1] / dashboardData.stats.depositLiability * 80)} L 40 ${100 - (dashboardData.charts.depositGrowth[2] / dashboardData.stats.depositLiability * 80)} L 60 ${100 - (dashboardData.charts.depositGrowth[3] / dashboardData.stats.depositLiability * 80)} L 80 ${100 - (dashboardData.charts.depositGrowth[4] / dashboardData.stats.depositLiability * 80)} L 100 ${100 - (dashboardData.charts.depositGrowth[5] / dashboardData.stats.depositLiability * 80)} L 100 100 Z`}
                    fill="url(#chartGrad1)"
                  />
                  {/* Line */}
                  <path
                    d={`M 0 ${100 - (dashboardData.charts.depositGrowth[0] / dashboardData.stats.depositLiability * 80)} L 20 ${100 - (dashboardData.charts.depositGrowth[1] / dashboardData.stats.depositLiability * 80)} L 40 ${100 - (dashboardData.charts.depositGrowth[2] / dashboardData.stats.depositLiability * 80)} L 60 ${100 - (dashboardData.charts.depositGrowth[3] / dashboardData.stats.depositLiability * 80)} L 80 ${100 - (dashboardData.charts.depositGrowth[4] / dashboardData.stats.depositLiability * 80)} L 100 ${100 - (dashboardData.charts.depositGrowth[5] / dashboardData.stats.depositLiability * 80)}`}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2"
                  />
                </svg>
                {dashboardData.charts.labels.map((lbl, idx) => (
                  <div key={idx} className="flex flex-col items-center w-full z-10">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-1 py-0.5 rounded shadow-sm">
                      ₹{Math.round(dashboardData.charts.depositGrowth[idx] / 1000)}k
                    </span>
                    <span className="text-[10px] text-slate-450 mt-2 font-bold uppercase">{lbl}</span>
                  </div>
                ))}
              </div>
            </CardWrapper>

            {/* Chart 2: Loan Growth (Bar Chart) */}
            <CardWrapper className="p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Loan Outstanding Trend</h4>
              <div className="h-64 flex items-end justify-between relative px-2 pt-6">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                </svg>
                {dashboardData.charts.labels.map((lbl, idx) => {
                  const percent = Math.round(dashboardData.charts.loanGrowth[idx] / dashboardData.stats.loanOutstanding * 80);
                  return (
                    <div key={idx} className="flex flex-col items-center w-full z-10 group cursor-pointer">
                      <div
                        className="w-8 bg-indigo-500/80 group-hover:bg-indigo-600 rounded-t-lg transition-all duration-300 shadow-sm"
                        style={{ height: `${percent}px` }}
                      />
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-1 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{Math.round(dashboardData.charts.loanGrowth[idx] / 1000)}k
                      </span>
                      <span className="text-[10px] text-slate-450 mt-1 font-bold uppercase">{lbl}</span>
                    </div>
                  );
                })}
              </div>
            </CardWrapper>

            {/* Chart 3: Collection Trends (Area Chart) */}
            <CardWrapper className="p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Collection Trends</h4>
              <div className="h-64 flex items-end justify-between relative px-2 pt-6">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <defs>
                    <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 100 L 0 ${100 - (dashboardData.charts.collectionTrends[0] / 120000 * 80)} L 20 ${100 - (dashboardData.charts.collectionTrends[1] / 120000 * 80)} L 40 ${100 - (dashboardData.charts.collectionTrends[2] / 120000 * 80)} L 60 ${100 - (dashboardData.charts.collectionTrends[3] / 120000 * 80)} L 80 ${100 - (dashboardData.charts.collectionTrends[4] / 120000 * 80)} L 100 ${100 - (dashboardData.charts.collectionTrends[5] / 120000 * 80)} L 100 100 Z`}
                    fill="url(#chartGrad2)"
                  />
                  <path
                    d={`M 0 ${100 - (dashboardData.charts.collectionTrends[0] / 120000 * 80)} L 20 ${100 - (dashboardData.charts.collectionTrends[1] / 120000 * 80)} L 40 ${100 - (dashboardData.charts.collectionTrends[2] / 120000 * 80)} L 60 ${100 - (dashboardData.charts.collectionTrends[3] / 120000 * 80)} L 80 ${100 - (dashboardData.charts.collectionTrends[4] / 120000 * 80)} L 100 ${100 - (dashboardData.charts.collectionTrends[5] / 120000 * 80)}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </svg>
                {dashboardData.charts.labels.map((lbl, idx) => (
                  <div key={idx} className="flex flex-col items-center w-full z-10">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-1 py-0.5 rounded shadow-sm">
                      ₹{Math.round(dashboardData.charts.collectionTrends[idx] / 1000)}k
                    </span>
                    <span className="text-[10px] text-slate-450 mt-2 font-bold uppercase">{lbl}</span>
                  </div>
                ))}
              </div>
            </CardWrapper>

            {/* Chart 4: Profit Trends (Area Chart) */}
            <CardWrapper className="p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Accumulated Profit Trends</h4>
              <div className="h-64 flex items-end justify-between relative px-2 pt-6">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-850" />
                  <defs>
                    <linearGradient id="chartGrad3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 100 L 0 ${100 - (dashboardData.charts.profitTrends[0] / 40000 * 80)} L 20 ${100 - (dashboardData.charts.profitTrends[1] / 40000 * 80)} L 40 ${100 - (dashboardData.charts.profitTrends[2] / 40000 * 80)} L 60 ${100 - (dashboardData.charts.profitTrends[3] / 40000 * 80)} L 80 ${100 - (dashboardData.charts.profitTrends[4] / 40000 * 80)} L 100 ${100 - (dashboardData.charts.profitTrends[5] / 40000 * 80)} L 100 100 Z`}
                    fill="url(#chartGrad3)"
                  />
                  <path
                    d={`M 0 ${100 - (dashboardData.charts.profitTrends[0] / 40000 * 80)} L 20 ${100 - (dashboardData.charts.profitTrends[1] / 40000 * 80)} L 40 ${100 - (dashboardData.charts.profitTrends[2] / 40000 * 80)} L 60 ${100 - (dashboardData.charts.profitTrends[3] / 40000 * 80)} L 80 ${100 - (dashboardData.charts.profitTrends[4] / 40000 * 80)} L 100 ${100 - (dashboardData.charts.profitTrends[5] / 40000 * 80)}`}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2"
                  />
                </svg>
                {dashboardData.charts.labels.map((lbl, idx) => (
                  <div key={idx} className="flex flex-col items-center w-full z-10">
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-1 py-0.5 rounded shadow-sm">
                      ₹{Math.round(dashboardData.charts.profitTrends[idx] / 1000)}k
                    </span>
                    <span className="text-[10px] text-slate-450 mt-2 font-bold uppercase">{lbl}</span>
                  </div>
                ))}
              </div>
            </CardWrapper>

          </div>

        </div>
      ) : (
        <div className="py-20 text-center text-slate-500">
          Failed to fetch dashboard stats. Please make sure database is connected and Jaipur branch is selected.
        </div>
      )}
    </div>
  );
}
