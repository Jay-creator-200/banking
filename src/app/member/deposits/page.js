'use client';

import React, { useState, useEffect } from 'react';
import { PiggyBank, Calendar, FileText, Download, Award } from 'lucide-react';

export default function MemberDeposits() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('fd');
  const [loading, setLoading] = useState(true);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDeposits() {
      try {
        const response = await fetch('/api/member/deposits');
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Failed to fetch deposits list');
        setData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDeposits();
  }, []);

  const handleGenerateCertificate = async (depositId, type) => {
    setCertificateLoading(true);
    setGeneratedCertificate(null);
    try {
      const response = await fetch('/api/member/statements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: type,
          accountId: depositId,
          format: 'pdf',
        }),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to generate certificate');
      setGeneratedCertificate(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setCertificateLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Loading deposit portfolios...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Failed to load deposits</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'fd', label: 'Fixed Deposits', count: data?.fds?.length || 0 },
    { id: 'rd', label: 'Recurring Deposits', count: data?.rds?.length || 0 },
    { id: 'dds', label: 'Daily Deposits', count: data?.dds?.length || 0 },
    { id: 'mis', label: 'Monthly Investment', count: data?.mis?.length || 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Active Deposit Schemes & Certificates</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage fixed, recurring, daily, and monthly interest deposits, and download maturity receipts.</p>
      </div>

      {/* Tabs list selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setGeneratedCertificate(null);
            }}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400'
                : 'border-transparent text-slate-450 hover:text-slate-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Active Certificate download message */}
      {generatedCertificate && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Deposit Certificate Created</p>
              <p className="text-[9px] text-slate-450 dark:text-slate-500 truncate max-w-[300px]">{generatedCertificate.fileName}</p>
            </div>
          </div>
          <a
            href={generatedCertificate.cloudinaryUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-650 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Tab Contents list */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
        {activeTab === 'fd' && (
          (!data?.fds || data.fds.length === 0) ? (
            <div className="p-12 text-center text-xs text-slate-500">No active Fixed Deposit portfolios found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                    <th className="px-6 py-4">Account No / Scheme</th>
                    <th className="px-6 py-4 text-right">Principal</th>
                    <th className="px-6 py-4 text-right">Interest Rate</th>
                    <th className="px-6 py-4">Maturity Date</th>
                    <th className="px-6 py-4 text-right">Maturity Value</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                  {data.fds.map((fd) => (
                    <tr key={fd._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-850 dark:text-slate-200">{fd.fdAccountNo}</div>
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{fd.schemeId?.schemeName || 'Fixed Scheme'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-350">{formatCurrency(fd.principalAmount)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">{fd.interestRate}%</td>
                      <td className="px-6 py-4 font-semibold text-slate-550 dark:text-slate-400">{new Date(fd.maturityDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(fd.maturityAmount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          fd.status === 'active' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {fd.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleGenerateCertificate(fd._id, 'fd')}
                          disabled={certificateLoading}
                          className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'rd' && (
          (!data?.rds || data.rds.length === 0) ? (
            <div className="p-12 text-center text-xs text-slate-500">No active Recurring Deposit portfolios found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                    <th className="px-6 py-4">Account No / Scheme</th>
                    <th className="px-6 py-4 text-right">Monthly EMI</th>
                    <th className="px-6 py-4 text-right">Total Deposited</th>
                    <th className="px-6 py-4 text-right">Interest Rate</th>
                    <th className="px-6 py-4">Next Due Date</th>
                    <th className="px-6 py-4 text-right">Maturity Value</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                  {data.rds.map((rd) => (
                    <tr key={rd._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-850 dark:text-slate-200">{rd.rdAccountNo}</div>
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{rd.schemeId?.schemeName || 'Recurring Scheme'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-350">{formatCurrency(rd.monthlyInstallment)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-350">{formatCurrency(rd.totalDepositAmount)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">{rd.interestRate}%</td>
                      <td className="px-6 py-4 font-semibold text-slate-550 dark:text-slate-400">{rd.nextInstallmentDate ? new Date(rd.nextInstallmentDate).toLocaleDateString('en-IN') : 'Matured'}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(rd.maturityAmount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          rd.status === 'active' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {rd.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleGenerateCertificate(rd._id, 'rd')}
                          disabled={certificateLoading}
                          className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'dds' && (
          (!data?.dds || data.dds.length === 0) ? (
            <div className="p-12 text-center text-xs text-slate-500">No active Daily Deposit Scheme portfolios found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                    <th className="px-6 py-4">Account No</th>
                    <th className="px-6 py-4 text-right">Daily Limit</th>
                    <th className="px-6 py-4 text-right">Total Deposited</th>
                    <th className="px-6 py-4">Maturity Date</th>
                    <th className="px-6 py-4 text-right">Estimated Maturity</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                  {data.dds.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200">{d.ddsAccountNo}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-350">{formatCurrency(d.dailyAmount)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-350">{formatCurrency(d.totalDeposit)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-550 dark:text-slate-400">{new Date(d.maturityDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(d.maturityAmount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          d.status === 'active' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'mis' && (
          (!data?.mis || data.mis.length === 0) ? (
            <div className="p-12 text-center text-xs text-slate-500">No active Monthly Investment Scheme portfolios found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                    <th className="px-6 py-4">Account No</th>
                    <th className="px-6 py-4 text-right">Principal Amount</th>
                    <th className="px-6 py-4 text-right">Interest Rate</th>
                    <th className="px-6 py-4 text-right">Monthly Payout</th>
                    <th className="px-6 py-4">Next Payout Date</th>
                    <th className="px-6 py-4">Maturity Date</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                  {data.mis.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200">{m.misAccountNo}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-350">{formatCurrency(m.principalAmount)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">{m.interestRate}%</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-450">{formatCurrency(m.monthlyInterestAmount)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-550 dark:text-slate-400">{new Date(m.nextPayoutDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-550 dark:text-slate-400">{new Date(m.maturityDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          m.status === 'active' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
