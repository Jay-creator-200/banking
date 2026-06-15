'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';
import { FileSpreadsheet, Download, RefreshCw, Printer, AlertCircle, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('trial-balance');
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  // Load branches
  useEffect(() => {
    fetch('/api/branches?limit=100')
      .then(res => res.ok && res.json())
      .then(json => json && setBranches(json.data))
      .catch(err => console.error('Failed to load branches:', err));
  }, []);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append('branchId', branchFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const endpoint = `/api/reports/${activeTab}`;
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.data);
      } else {
        setReportData(null);
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab} report:`, err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, branchFilter, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle CSV Export
  const handleExportCSV = () => {
    if (!reportData) return;

    if (activeTab === 'trial-balance') {
      const cols = [
        { header: 'Account Code', accessor: 'accountCode' },
        { header: 'Account Name', accessor: 'accountName' },
        { header: 'Debit Balance (₹)', accessor: 'debitBalance' },
        { header: 'Credit Balance (₹)', accessor: 'creditBalance' },
      ];
      exportToCSV(reportData.rows, cols, `Trial-Balance-${new Date().toLocaleDateString()}.csv`);
    } else if (activeTab === 'balance-sheet') {
      const rows = [];
      rows.push({ name: '--- ASSETS ---', balance: '' });
      reportData.assets.forEach(a => rows.push({ name: `${a.code} - ${a.accountName}`, balance: a.balance }));
      rows.push({ name: 'TOTAL ASSETS', balance: reportData.assetsTotal });
      
      rows.push({ name: '', balance: '' });
      rows.push({ name: '--- LIABILITIES ---', balance: '' });
      reportData.liabilities.forEach(l => rows.push({ name: `${l.code} - ${l.accountName}`, balance: l.balance }));
      rows.push({ name: 'TOTAL LIABILITIES', balance: reportData.liabilitiesTotal });

      rows.push({ name: '', balance: '' });
      rows.push({ name: '--- EQUITY ---', balance: '' });
      reportData.equity.forEach(e => rows.push({ name: `${e.code} - ${e.accountName}`, balance: e.balance }));
      rows.push({ name: 'TOTAL EQUITY', balance: reportData.equityTotal });

      const cols = [
        { header: 'Particulars', accessor: 'name' },
        { header: 'Amount (₹)', accessor: 'balance' }
      ];
      exportToCSV(rows, cols, `Balance-Sheet-${new Date().toLocaleDateString()}.csv`);
    } else if (activeTab === 'profit-loss') {
      const rows = [];
      rows.push({ name: '--- INCOME ---', balance: '' });
      reportData.income.forEach(i => rows.push({ name: `${i.code} - ${i.accountName}`, balance: i.balance }));
      rows.push({ name: 'TOTAL INCOME', balance: reportData.totalIncome });

      rows.push({ name: '', balance: '' });
      rows.push({ name: '--- EXPENSES ---', balance: '' });
      reportData.expenses.forEach(e => rows.push({ name: `${e.code} - ${e.accountName}`, balance: e.balance }));
      rows.push({ name: 'TOTAL EXPENSE', balance: reportData.totalExpense });
      rows.push({ name: 'NET PROFIT/LOSS', balance: reportData.netProfitLoss });

      const cols = [
        { header: 'Particulars', accessor: 'name' },
        { header: 'Amount (₹)', accessor: 'balance' }
      ];
      exportToCSV(rows, cols, `Profit-Loss-${new Date().toLocaleDateString()}.csv`);
    } else if (activeTab === 'cash-flow') {
      const rows = [
        { desc: 'Opening Cash Position', amount: reportData.openingCash },
        { desc: '--- CASH INFLOWS ---', amount: '' },
        { desc: 'Deposits Inflow', amount: reportData.inflows.deposits },
        { desc: 'Loan Collections Inflow', amount: reportData.inflows.loanCollections },
        { desc: 'Fees & Service Charges Inflow', amount: reportData.inflows.fees },
        { desc: 'Other Inflows', amount: reportData.inflows.other },
        { desc: 'TOTAL CASH INFLOWS', amount: reportData.totalInflow },
        { desc: '--- CASH OUTFLOWS ---', amount: '' },
        { desc: 'Withdrawals Outflow', amount: reportData.outflows.withdrawals },
        { desc: 'Loan Disbursements Outflow', amount: reportData.outflows.loanDisbursements },
        { desc: 'Operating Expenses Outflow', amount: reportData.outflows.expenses },
        { desc: 'Other Outflows', amount: reportData.outflows.other },
        { desc: 'TOTAL CASH OUTFLOWS', amount: reportData.totalOutflow },
        { desc: 'Net Closing Cash Position', amount: reportData.closingCash }
      ];
      const cols = [
        { header: 'Activity Description', accessor: 'desc' },
        { header: 'Amount (₹)', accessor: 'amount' }
      ];
      exportToCSV(rows, cols, `Cash-Flow-${new Date().toLocaleDateString()}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Statements Hub"
        subtitle="Cooperative banking ledgers, statements, and regulatory trial books."
      >
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!reportData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
          <button
            onClick={() => window.print()}
            disabled={!reportData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </PageHeader>

      {/* Filters */}
      <CardWrapper className="p-4 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <FileSpreadsheet className="w-4 h-4 text-slate-400" />
          
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.branchName}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 dark:text-slate-300 focus:outline-none"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 dark:text-slate-300 focus:outline-none"
          />

          <button
            onClick={fetchReport}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardWrapper>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-t-xl overflow-hidden print:hidden">
        {['trial-balance', 'balance-sheet', 'profit-loss', 'cash-flow'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setReportData(null); }}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab
                ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 dark:border-indigo-500 bg-slate-50/20 dark:bg-slate-900/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800/80 rounded-b-xl overflow-hidden shadow-sm p-6">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !reportData ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-450">
            No report data found. Please check date filters and ensure seed data is present.
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Scenarios and validations alerts */}
            {activeTab === 'trial-balance' && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 font-semibold text-sm ${
                reportData.isBalanced 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450'
              }`}>
                {reportData.isBalanced ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Integrity Check Passed: Debit (₹{reportData.totalDebits.toLocaleString('en-IN')}) equals Credit (₹{reportData.totalCredits.toLocaleString('en-IN')}).</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Integrity Check Failed: General Ledger is out of balance. Difference: ₹{Math.abs(reportData.totalDebits - reportData.totalCredits).toLocaleString('en-IN')}.</span>
                  </>
                )}
              </div>
            )}

            {activeTab === 'balance-sheet' && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 font-semibold text-sm ${
                reportData.difference === 0 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450'
              }`}>
                {reportData.difference === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Accounting Equation Balances: Assets (₹{reportData.assetsTotal.toLocaleString('en-IN')}) matches Liabilities + Equity (₹{(reportData.liabilitiesTotal + reportData.equityTotal).toLocaleString('en-IN')}).</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Accounting Equation Discrepancy: Assets do not match Liabilities + Equity. Difference: ₹{reportData.difference.toLocaleString('en-IN')}.</span>
                  </>
                )}
              </div>
            )}

            {/* Render Tab Specific Tables */}
            {activeTab === 'trial-balance' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4">Account Code</th>
                      <th className="px-6 py-4">Account Head Name</th>
                      <th className="px-6 py-4 text-right">Debit Balance (₹)</th>
                      <th className="px-6 py-4 text-right">Credit Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-xs font-semibold">
                        <td className="px-6 py-4 font-mono">{row.accountCode}</td>
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200">{row.accountName}</td>
                        <td className="px-6 py-4 text-right text-emerald-600">{row.debitBalance > 0 ? `₹${row.debitBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                        <td className="px-6 py-4 text-right text-rose-500">{row.creditBalance > 0 ? `₹${row.creditBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900/80 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      <td colSpan={2} className="px-6 py-4 text-right uppercase">Total Book Balance</td>
                      <td className="px-6 py-4 text-right text-emerald-600">₹{reportData.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right text-rose-500">₹{reportData.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'balance-sheet' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Assets Column */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4">Assets (Inflow Ledger)</th>
                        <th className="px-6 py-4 text-right">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.assets.map((a, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200">[{a.code}] {a.accountName}</td>
                          <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span>TOTAL ASSETS</span>
                    <span>₹{reportData.assetsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="space-y-6 flex flex-col justify-between">
                  {/* Liabilities Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                          <th className="px-6 py-4">Liabilities (Deposit Books)</th>
                          <th className="px-6 py-4 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.liabilities.map((l, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200">[{l.code}] {l.accountName}</td>
                            <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">₹{l.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-xs text-slate-800 dark:text-slate-200">
                      <span>TOTAL LIABILITIES</span>
                      <span>₹{reportData.liabilitiesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Equity Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                          <th className="px-6 py-4">Equity Capital Reserves</th>
                          <th className="px-6 py-4 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.equity.map((e, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200">[{e.code}] {e.accountName}</td>
                            <td className={`px-6 py-4 text-right ${e.balance < 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>₹{e.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-xs text-slate-800 dark:text-slate-200">
                      <span>TOTAL EQUITY</span>
                      <span>₹{reportData.equityTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'profit-loss' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Income Columns */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4">Income Sources</th>
                        <th className="px-6 py-4 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.income.map((i, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200">[{i.code}] {i.accountName}</td>
                          <td className="px-6 py-4 text-right text-emerald-600">₹{i.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span>TOTAL INCOME</span>
                    <span className="text-emerald-600">₹{reportData.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Expense Columns */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4">Operating & Financial Expenses</th>
                        <th className="px-6 py-4 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.expenses.map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200">[{e.code}] {e.accountName}</td>
                          <td className="px-6 py-4 text-right text-rose-500">₹{e.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-xs text-slate-800 dark:text-slate-200">
                    <span>TOTAL EXPENDITURES</span>
                    <span className="text-rose-500">₹{reportData.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Profit summary banner */}
                <div className="col-span-1 md:col-span-2 p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/40 dark:border-slate-850 flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">NET SOCIETY OPERATIONAL PROFIT / LOSS</span>
                  <span className={`text-lg font-extrabold ${reportData.netProfitLoss >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    ₹{reportData.netProfitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'cash-flow' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-w-2xl mx-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4">Cash Position & Activities</th>
                      <th className="px-6 py-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 bg-slate-50/20 dark:bg-slate-900/10 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <td className="px-6 py-4">Opening Cash & Bank Balance</td>
                      <td className="px-6 py-4 text-right">₹{reportData.openingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    
                    <tr className="bg-slate-50/50 dark:bg-slate-900/20 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      <td colSpan={2} className="px-6 py-2">Cash Inflow Streams</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Cooperative Deposit Collections</td>
                      <td className="px-6 py-3 text-right text-emerald-600">+₹{reportData.inflows.deposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Loan Repayments / Collections</td>
                      <td className="px-6 py-3 text-right text-emerald-600">+₹{reportData.inflows.loanCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Service Charges, processing & fees</td>
                      <td className="px-6 py-3 text-right text-emerald-600">+₹{reportData.inflows.fees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Other Inflow Adjustments</td>
                      <td className="px-6 py-3 text-right text-emerald-600">+₹{reportData.inflows.other.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-150 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <td className="px-6 py-3 pl-6">Total Periodic Cash Inflows</td>
                      <td className="px-6 py-3 text-right text-emerald-600">₹{reportData.totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="bg-slate-50/50 dark:bg-slate-900/20 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      <td colSpan={2} className="px-6 py-2">Cash Outflow Activities</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Deposit Account Withdrawals</td>
                      <td className="px-6 py-3 text-right text-rose-500">-₹{reportData.outflows.withdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Loan Disbursements executed</td>
                      <td className="px-6 py-3 text-right text-rose-500">-₹{reportData.outflows.loanDisbursements.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Paid Operational Expenditures</td>
                      <td className="px-6 py-3 text-right text-rose-500">-₹{reportData.outflows.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-900/50 text-xs font-semibold">
                      <td className="px-6 py-3 pl-10 text-slate-700 dark:text-slate-350">Other Outflow Adjustments</td>
                      <td className="px-6 py-3 text-right text-rose-500">-₹{reportData.outflows.other.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <td className="px-6 py-3 pl-6">Total Periodic Cash Outflows</td>
                      <td className="px-6 py-3 text-right text-rose-500">₹{reportData.totalOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="bg-slate-900 dark:bg-slate-900 text-white font-extrabold border-t border-slate-200 dark:border-slate-800 text-xs">
                      <td className="px-6 py-4 uppercase">Closing Net Cash Balance</td>
                      <td className="px-6 py-4 text-right">₹{reportData.closingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
