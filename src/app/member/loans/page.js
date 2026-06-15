'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Landmark, CheckCircle, Clock, FileText, Download } from 'lucide-react';

export default function MemberLoans() {
  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [loanDetail, setLoanDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generatedStatement, setGeneratedStatement] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLoans() {
      try {
        const response = await fetch('/api/member/loans');
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Failed to fetch loans');
        setLoans(res.data);
        if (res.data.length > 0) {
          setSelectedLoanId(res.data[0]._id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadLoans();
  }, []);

  useEffect(() => {
    if (!selectedLoanId) return;

    async function loadLoanDetail() {
      setDetailLoading(true);
      setGeneratedStatement(null);
      try {
        const response = await fetch(`/api/member/loans?loanId=${selectedLoanId}`);
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Failed to load loan schedule details');
        setLoanDetail(res.data);
      } catch (err) {
        console.error('Failed to load loan schedules:', err.message);
      } finally {
        setDetailLoading(false);
      }
    }
    loadLoanDetail();
  }, [selectedLoanId]);

  const handleGenerateStatement = async (format) => {
    if (!selectedLoanId) return;

    setGenerateLoading(true);
    setGeneratedStatement(null);
    try {
      const response = await fetch('/api/member/statements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'loan',
          accountId: selectedLoanId,
          format,
        }),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to generate loan statement file');
      
      setGeneratedStatement(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerateLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Loading active loan accounts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Failed to retrieve loans</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Active Loan Accounts & EMIs</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track outstanding principles, monthly EMI dates, and full repayment schedules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Loan Accounts list */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Loan Portfolios</h2>
          {loans.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500">No active loans found for this member profile.</p>
            </div>
          ) : (
            loans.map((ln) => (
              <button
                key={ln._id}
                onClick={() => setSelectedLoanId(ln._id)}
                className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
                  selectedLoanId === ln._id
                    ? 'bg-slate-950 border-indigo-600 text-white dark:bg-indigo-950/20'
                    : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/60 text-slate-900 dark:text-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                    <Landmark className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    ['active', 'closed'].includes(ln.loanStatus) ? 'bg-emerald-500/10 text-emerald-450' : 'bg-rose-500/10 text-rose-450'
                  }`}>
                    {ln.loanStatus}
                  </span>
                </div>
                
                <h4 className="font-mono font-bold text-sm tracking-wide mt-4">
                  {ln.loanNo}
                </h4>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">
                  Product: {ln.loanProductId?.productName || 'General Loan'}
                </p>
                <h3 className="text-xl font-bold mt-3">
                  {formatCurrency(ln.principalAmount)}
                </h3>
              </button>
            ))
          )}

          {/* Statement generators */}
          {selectedLoanId && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Repayment Statement</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleGenerateStatement('pdf')}
                  disabled={generateLoading}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => handleGenerateStatement('excel')}
                  disabled={generateLoading}
                  className="py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Export Excel
                </button>
              </div>

              {generatedStatement && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Statement Ready</p>
                      <p className="text-[9px] text-slate-450 dark:text-slate-500 truncate max-w-[150px]">{generatedStatement.fileName}</p>
                    </div>
                  </div>
                  <a
                    href={generatedStatement.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-650 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Loan Schedules & Payment histories */}
        <div className="lg:col-span-2">
          {detailLoading ? (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 p-8 text-center animate-pulse">
              <p className="text-xs text-slate-500">Retrieving loan amortization tables...</p>
            </div>
          ) : !loanDetail ? (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-xs text-slate-500">Select a loan portfolio from the list to inspect schedules.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary details */}
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
                  <p className="text-base font-bold text-slate-800 dark:text-white mt-1">
                    {formatCurrency((loanDetail.loan?.outstandingPrincipal || 0) + (loanDetail.loan?.outstandingInterest || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly EMI</p>
                  <p className="text-base font-bold text-slate-850 dark:text-white mt-1">
                    {formatCurrency(loanDetail.loan?.emiAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Due Date</p>
                  <p className="text-base font-bold text-slate-850 dark:text-white mt-1">
                    {loanDetail.loan?.nextDueDate ? new Date(loanDetail.loan.nextDueDate).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disbursement Date</p>
                  <p className="text-base font-bold text-slate-850 dark:text-white mt-1">
                    {new Date(loanDetail.loan?.disbursementDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Installment Schedule Table */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">EMI Amortization Schedule</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                        <th className="px-6 py-4">Installment</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4 text-right">Principal</th>
                        <th className="px-6 py-4 text-right">Interest</th>
                        <th className="px-6 py-4 text-right">Total Due</th>
                        <th className="px-6 py-4 text-right">Paid Amount</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                      {loanDetail.schedule?.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                            #{item.installmentNo}
                          </td>
                          <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-semibold">
                            {new Date(item.dueDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-350">
                            {formatCurrency(item.principalDue)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-350">
                            {formatCurrency(item.interestDue)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(item.totalDue)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-750 dark:text-slate-350 font-bold">
                            {formatCurrency(item.paidAmount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              item.paymentStatus === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-450'
                                : item.paymentStatus === 'overdue'
                                ? 'bg-rose-500/10 text-rose-450'
                                : 'bg-amber-500/10 text-amber-450'
                            }`}>
                              {item.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
