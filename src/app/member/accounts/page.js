'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Download, Wallet } from 'lucide-react';

export default function MemberAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [statementRows, setStatementRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statementLoading, setStatementLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form for statement filtering
  const [filterData, setFilterData] = useState({
    startDate: '',
    endDate: '',
    format: 'pdf',
  });

  const [generatedStatement, setGeneratedStatement] = useState(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch('/api/member/dashboard');
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Failed to fetch accounts');
        
        // Fetch accounts using detailed endpoints
        const accsRes = await fetch('/api/savings-accounts');
        const accsData = await accsRes.json();
        
        if (accsData.success && accsData.data && accsData.data.docs) {
          setAccounts(accsData.data.docs);
          if (accsData.data.docs.length > 0) {
            setSelectedAcc(accsData.data.docs[0]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAcc) return;

    async function loadStatement() {
      setStatementLoading(true);
      try {
        // Query statements from ledger history
        const url = `/api/savings-accounts/${selectedAcc._id}`;
        const res = await fetch(url);
        const resData = await res.json();
        
        // Fetch statement details
        const stmtRes = await fetch(`/api/savings-accounts/statement?accountId=${selectedAcc._id}`);
        const stmtData = await stmtRes.json();
        
        if (stmtData.success && stmtData.data) {
          setStatementRows(stmtData.data.rows || []);
        } else {
          setStatementRows([]);
        }
      } catch (err) {
        console.error('Failed to load transaction list:', err.message);
      } finally {
        setStatementLoading(false);
      }
    }
    loadStatement();
  }, [selectedAcc]);

  const handleGenerateStatement = async (e) => {
    e.preventDefault();
    if (!selectedAcc) return;

    setGenerateLoading(true);
    setGeneratedStatement(null);
    try {
      const response = await fetch('/api/member/statements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'savings',
          accountId: selectedAcc._id,
          startDate: filterData.startDate || undefined,
          endDate: filterData.endDate || undefined,
          format: filterData.format,
        }),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to generate digital statement file');
      
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
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Loading savings accounts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Failed to retrieve accounts</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Savings Accounts & statements</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review ledger transactions, available balances, and request official PDF statements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Account Cards */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Savings Accounts</h2>
          {accounts.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500">No active savings accounts found for this member.</p>
            </div>
          ) : (
            accounts.map((acc) => (
              <button
                key={acc._id}
                onClick={() => setSelectedAcc(acc)}
                className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
                  selectedAcc?._id === acc._id
                    ? 'bg-slate-950 border-indigo-600 text-white dark:bg-indigo-950/20'
                    : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/60 text-slate-900 dark:text-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                    <Wallet className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                  }`}>
                    {acc.status}
                  </span>
                </div>
                
                <h4 className="font-mono font-bold text-sm tracking-wide mt-4">
                  {acc.accountNo}
                </h4>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">
                  Type: {acc.accountType} (IR: {acc.interestRate}%)
                </p>
                <h3 className="text-xl font-bold mt-3">
                  {formatCurrency(acc.currentBalance)}
                </h3>
              </button>
            ))
          )}

          {/* Statement download Request Box */}
          {selectedAcc && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">Request Statement</h3>
              <form onSubmit={handleGenerateStatement} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filterData.startDate}
                    onChange={(e) => setFilterData({ ...filterData, startDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filterData.endDate}
                    onChange={(e) => setFilterData({ ...filterData, endDate: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">File Format</label>
                  <select
                    value={filterData.format}
                    onChange={(e) => setFilterData({ ...filterData, format: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                  >
                    <option value="pdf" className="bg-white dark:bg-slate-950">PDF Document</option>
                    <option value="excel" className="bg-white dark:bg-slate-950">Excel Spreadsheet</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={generateLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {generateLoading ? 'Generating file...' : 'Build Digital Statement'}
                </button>
              </form>

              {generatedStatement && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
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

        {/* Right Side: Passbook ledger list */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Running Ledger Book</h3>
              <span className="text-[10px] font-bold font-mono text-slate-400">{selectedAcc?.accountNo}</span>
            </div>

            {statementLoading ? (
              <div className="p-8 text-center animate-pulse">
                <p className="text-xs text-slate-500">Querying transaction log registers...</p>
              </div>
            ) : statementRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-500">No transactions recorded for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                      <th className="px-6 py-4">Date / Ref No</th>
                      <th className="px-6 py-4">Narration</th>
                      <th className="px-6 py-4 text-right">Withdrawal (Dr)</th>
                      <th className="px-6 py-4 text-right">Deposit (Cr)</th>
                      <th className="px-6 py-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {statementRows.map((row) => (
                      <tr key={row._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-850 dark:text-slate-200">
                            {new Date(row.date).toLocaleDateString('en-IN')}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">{row.transactionNo}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {row.narration}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-455">
                          {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-450">
                          {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
