'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { UploadCloud, CheckCircle, RefreshCw, AlertTriangle, HelpCircle, FileSpreadsheet, Plus, HelpCircle as PendingIcon } from 'lucide-react';

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState('bank');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  // Bank reconciliation state
  const [bankAccount, setBankAccount] = useState('SBI-987654321');
  const [statementDate, setStatementDate] = useState('');
  const [openingBalance, setOpeningBalance] = useState('200000');
  const [closingBalance, setClosingBalance] = useState('176300');
  const [reconciliations, setReconciliations] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankSuccess, setBankSuccess] = useState('');

  // Cash reconciliation state
  const [cashReport, setCashReport] = useState(null);
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashLoading, setCashLoading] = useState(false);

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
      .catch(err => console.error('Failed to load branches:', err));
  }, []);

  // Fetch Bank Reconciliations list
  const fetchReconciliations = useCallback(async () => {
    setLoading(true);
    setBankError('');
    try {
      const res = await fetch(`/api/reconciliation/bank?bankAccount=${bankAccount}`);
      if (res.ok) {
        const json = await res.json();
        setReconciliations(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bankAccount]);

  useEffect(() => {
    if (activeTab === 'bank') {
      fetchReconciliations();
    }
  }, [activeTab, fetchReconciliations]);

  // Fetch Cash Reconciliation Report
  const fetchCashReport = useCallback(async () => {
    if (!selectedBranch) return;
    setCashLoading(true);
    try {
      const res = await fetch(`/api/reconciliation/cash?branchId=${selectedBranch}&date=${cashDate}`);
      if (res.ok) {
        const json = await res.json();
        setCashReport(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCashLoading(false);
    }
  }, [selectedBranch, cashDate]);

  useEffect(() => {
    if (activeTab === 'cash') {
      fetchCashReport();
    }
  }, [activeTab, fetchCashReport]);

  // Handle CSV Import Upload
  const handleCsvImport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBankError('');
    setBankSuccess('');

    try {
      // Parse CSV Text: Date, Description, Reference, Debit, Credit
      // Mock parsing lines
      if (!csvContent.trim()) {
        throw new Error('Please input bank statement CSV data lines.');
      }

      const rows = [];
      const lines = csvContent.trim().split('\n');
      for (const line of lines) {
        const cols = line.split(',');
        if (cols.length < 5) continue;
        rows.push({
          date: cols[0].trim(),
          description: cols[1].trim(),
          refNo: cols[2].trim(),
          debit: parseFloat(cols[3].trim() || '0'),
          credit: parseFloat(cols[4].trim() || '0')
        });
      }

      if (rows.length === 0) {
        throw new Error('No valid CSV rows parsed. Format: Date,Description,RefNo,Debit,Credit');
      }

      const res = await fetch('/api/reconciliation/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccount,
          statementDate: statementDate || new Date().toISOString(),
          openingBalance: parseFloat(openingBalance),
          closingBalance: parseFloat(closingBalance),
          csvRows: rows
        })
      });

      const json = await res.json();
      if (res.ok) {
        setBankSuccess('Bank statement processed. Automated heuristics matched matching transactions.');
        setCsvContent('');
        fetchReconciliations();
      } else {
        setBankError(json.message || 'Failed to process bank statement.');
      }
    } catch (err) {
      setBankError(err.message || 'Error occurred during CSV upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger Reconciliation Desk"
        subtitle="Automatic bank ledger checkouts, statement matching, and cashier cash book reconciliation."
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-t-xl overflow-hidden print:hidden">
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500 bg-slate-50/20 dark:bg-slate-900/10'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Bank Statement Matching
        </button>
        <button
          onClick={() => setActiveTab('cash')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'cash'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500 bg-slate-50/20 dark:bg-slate-900/10'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Teller Cash Reconciliation
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800/80 rounded-b-xl overflow-hidden shadow-sm p-6">
        
        {/* BANK RECONCILIATION TAB */}
        {activeTab === 'bank' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Import CSV Card */}
              <div className="lg:col-span-1">
                <CardWrapper className="p-5">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-indigo-600" />
                    Upload Bank Statement
                  </h4>
                  
                  {bankError && (
                    <div className="mb-4 p-3 rounded-lg border border-rose-100 bg-rose-50 text-rose-800 text-xs font-semibold">
                      {bankError}
                    </div>
                  )}

                  {bankSuccess && (
                    <div className="mb-4 p-3 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                      {bankSuccess}
                    </div>
                  )}

                  <form onSubmit={handleCsvImport} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Bank Account</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-250 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Opening Bal (₹)</label>
                        <input
                          type="number"
                          value={openingBalance}
                          onChange={(e) => setOpeningBalance(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-250 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Closing Bal (₹)</label>
                        <input
                          type="number"
                          value={closingBalance}
                          onChange={(e) => setClosingBalance(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-250 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Statement Date</label>
                      <input
                        type="date"
                        value={statementDate}
                        onChange={(e) => setStatementDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-250 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">CSV Statement Lines (Paste CSV data)</label>
                      <textarea
                        rows={5}
                        placeholder="2026-06-15,Rental Payment,REF-1092,25000,0&#10;2026-06-14,Interest Received,REF-9021,0,1500"
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-250 font-mono text-xs focus:outline-none resize-none"
                      />
                      <span className="block text-[10px] text-slate-400 mt-1">Columns required: Date,Description,RefNo,Debit,Credit</span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition-all disabled:opacity-50"
                    >
                      Import & Auto Match
                    </button>
                  </form>
                </CardWrapper>
              </div>

              {/* Bank Statement Uploads History List */}
              <div className="lg:col-span-2">
                <CardWrapper className="p-5 h-full">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Statement Reconciliation Books
                  </h4>
                  
                  {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner size="md" /></div>
                  ) : reconciliations.length > 0 ? (
                    <div className="space-y-6">
                      {reconciliations.map((r, rIdx) => {
                        const matchedCount = r.transactions.filter(t => t.status === 'Matched').length;
                        const totalCount = r.transactions.length;

                        return (
                          <div key={rIdx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                              <div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Account: {r.bankAccount}</span>
                                <span className="block text-[10px] font-bold text-slate-400 mt-0.5">As of Statement Date: {new Date(r.statementDate).toLocaleDateString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350">Balance: ₹{r.closingBalance.toLocaleString('en-IN')}</span>
                                <span className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{matchedCount} / {totalCount} Lines Matched</span>
                              </div>
                            </div>
                            
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                                  <th className="px-4 py-2.5">Date</th>
                                  <th className="px-4 py-2.5">Description</th>
                                  <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                                  <th className="px-4 py-2.5 text-right">Credit (₹)</th>
                                  <th className="px-4 py-2.5">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.transactions.map((t, idx) => (
                                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 font-medium text-slate-700 dark:text-slate-300">
                                    <td className="px-4 py-2.5">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2.5">
                                      <span>{t.description}</span>
                                      {t.refNo && <span className="block text-[9px] text-slate-400 font-mono mt-0.5">Ref: {t.refNo}</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-rose-500">{t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN')}` : '-'}</td>
                                    <td className="px-4 py-2.5 text-right text-emerald-600">{t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN')}` : '-'}</td>
                                    <td className="px-4 py-2.5">
                                      <StatusBadge status={t.status.toUpperCase()} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-10">No bank statement reconciliations registered yet.</p>
                  )}
                </CardWrapper>
              </div>

            </div>
          </div>
        )}

        {/* TELLER CASH RECONCILIATION TAB */}
        {activeTab === 'cash' && (
          <div className="space-y-6">
            <CardWrapper className="p-4 flex items-center gap-3 flex-wrap">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>

              <input
                type="date"
                value={cashDate}
                onChange={(e) => setCashDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 focus:outline-none"
              />

              <button
                onClick={fetchCashReport}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 rounded-lg cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </CardWrapper>

            {cashLoading ? (
              <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
            ) : cashReport ? (
              <div className="space-y-6">
                
                {/* Reconcile summary alert */}
                <div className={`p-4 rounded-xl border flex items-center gap-3 font-semibold text-sm ${
                  cashReport.status === 'RECONCILED' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450'
                }`}>
                  {cashReport.status === 'RECONCILED' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>All active teller sessions reconciliated. Expected cash matches physical cash drawer assets.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>Cash Discrepancy Found: Expected cash does not match physical counts. Difference: ₹{cashReport.totalDifference.toLocaleString('en-IN')}.</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CardWrapper className="p-4 bg-slate-50/20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Expected System Cash</span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">₹{cashReport.expectedCashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  </CardWrapper>
                  <CardWrapper className="p-4 bg-slate-50/20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Verified Physical Cash</span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">₹{cashReport.physicalCashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  </CardWrapper>
                  <CardWrapper className="p-4 bg-slate-50/20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Difference Amount</span>
                    <h4 className={`text-lg font-bold mt-1 ${cashReport.totalDifference === 0 ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500'}`}>
                      ₹{cashReport.totalDifference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h4>
                  </CardWrapper>
                </div>

                <CardWrapper className="p-5">
                  <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150 mb-4">Teller Sessions Breakdown</h4>
                  {cashReport.sessions && cashReport.sessions.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                            <th className="px-4 py-3">Session No</th>
                            <th className="px-4 py-3">Teller Name</th>
                            <th className="px-4 py-3 text-right">Expected (₹)</th>
                            <th className="px-4 py-3 text-right">Physical (₹)</th>
                            <th className="px-4 py-3 text-right">Diff (₹)</th>
                            <th className="px-4 py-3">Remarks</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashReport.sessions.map((s, idx) => (
                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 text-slate-700 dark:text-slate-300 font-medium">
                              <td className="px-4 py-3 font-semibold font-mono">{s.sessionNo}</td>
                              <td className="px-4 py-3">{s.tellerName}</td>
                              <td className="px-4 py-3 text-right">₹{s.expectedCash.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-right">₹{s.physicalCash.toLocaleString('en-IN')}</td>
                              <td className={`px-4 py-3 text-right font-extrabold ${s.difference === 0 ? 'text-slate-800 dark:text-slate-350' : 'text-rose-500'}`}>₹{s.difference.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-slate-450 italic">{s.remarks || 'No remarks'}</td>
                              <td className="px-4 py-3"><StatusBadge status={s.status.toUpperCase()} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-10">No active teller cash sessions registered on this date.</p>
                  )}
                </CardWrapper>

              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-10">No cash reconciliation report generated. Please check selected branch and date.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
