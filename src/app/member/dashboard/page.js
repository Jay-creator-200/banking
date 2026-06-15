'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Landmark, PiggyBank, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';

export default function MemberDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/member/dashboard');
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Failed to load dashboard statistics');
        setData(resData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Retrieving member profile stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Failed to load Dashboard</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  return (
    <div className="space-y-8">
      {/* Welcome and Summary Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Digital Member Workspace</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time overview of your savings, outstanding loans, and investments.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Savings balance */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-all duration-300" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Savings Balance</p>
              <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{formatCurrency(data?.savingsBalance)}</h3>
            </div>
          </div>
        </div>

        {/* Card 2: Loan outstanding */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-rose-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full group-hover:bg-rose-500/10 transition-all duration-300" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Active Loan Outstanding</p>
              <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{formatCurrency(data?.loanOutstanding)}</h3>
            </div>
          </div>
        </div>

        {/* Card 3: Deposit investments */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Deposit Schemes Invested</p>
              <h3 className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{formatCurrency(data?.depositInvestments)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Transactions</h2>
        </div>

        {(!data?.recentTransactions || data.recentTransactions.length === 0) ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-500">No recent transactions recorded on this member account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                  <th className="px-6 py-4">Transaction Info</th>
                  <th className="px-6 py-4">Account ID</th>
                  <th className="px-6 py-4">Payment Mode</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                {data.recentTransactions.map((txn) => {
                  const isCredit = [
                    'SAVINGS_DEPOSIT', 'INTEREST_CREDIT', 'RD_DEPOSIT', 'RD_DEPOSIT_TRANSFER',
                    'FD_DEPOSIT', 'FD_DEPOSIT_TRANSFER', 'DDS_DEPOSIT', 'DDS_DEPOSIT_TRANSFER',
                    'MIS_DEPOSIT', 'MIS_DEPOSIT_TRANSFER', 'MIS_PAYOUT_TRANSFER'
                  ].includes(txn.transactionType);

                  const dateStr = new Date(txn.approvedAt || txn.createdAt).toLocaleDateString('en-IN');

                  return (
                    <tr key={txn._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-850 dark:text-slate-200">
                          {txn.transactionType.replace(/_/g, ' ')}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-550 mt-1 font-semibold uppercase">
                          <span>{txn.transactionNo}</span>
                          <span>•</span>
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {txn.accountId}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-550 dark:text-slate-400">
                        {txn.paymentMode}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold text-sm ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
