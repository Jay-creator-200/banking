'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Vault,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function TellerReportsPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [reportType, setReportType] = useState('daily');
  const [branchId, setBranchId] = useState('');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    async function loadBranches() {
      const res = await fetch('/api/branches?limit=100');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || []);
      }
    }
    loadBranches();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    try {
      let url = `/api/teller-reports?reportType=${reportType}`;
      if (branchId) url += `&branchId=${branchId}`;
      if (reportType === 'daily') {
        url += `&date=${singleDate}`;
      } else if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setReportData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch report:', e);
    } finally {
      setLoading(false);
    }
  }, [reportType, branchId, singleDate, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const getRows = () => {
    if (!reportData) return [];
    if (reportType === 'daily') return reportData.sessions || [];
    if (reportType === 'vault') return reportData.transactions || [];
    if (reportType === 'performance') return reportData || [];
    return [];
  };

  const getColumns = () => {
    if (reportType === 'daily') {
      return [
        { header: 'Session No', accessor: 'sessionNo', cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg">{value}</span> },
        { header: 'Teller', accessor: 'teller', cell: ({ value, row }) => <div><p className="font-bold text-xs">{value}</p><p className="text-[10px] text-slate-450">{row.tellerEmail}</p></div> },
        { header: 'Branch', accessor: 'branch' },
        { header: 'Status', accessor: 'status', cell: ({ value }) => <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${value === 'open' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{value}</span> },
        { header: 'Opening (₹)', accessor: 'openingBalance', cell: ({ value }) => <span className="font-mono text-xs">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Deposits (₹)', accessor: 'totalDeposits', cell: ({ value }) => <span className="font-mono font-bold text-xs text-emerald-600">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Withdrawals (₹)', accessor: 'totalWithdrawals', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-600">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'System Bal (₹)', accessor: 'systemBalance', cell: ({ value }) => <span className="font-mono font-bold text-xs text-indigo-650 dark:text-indigo-400">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Difference (₹)', accessor: 'differenceAmount', cell: ({ value }) => <span className={`font-mono font-bold text-xs ${value !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{value >= 0 ? '+' : ''}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
      ];
    }
    if (reportType === 'vault') {
      return [
        { header: 'Vault Txn No', accessor: 'vaultTxnNo', cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-lg">{value}</span> },
        { header: 'Date', accessor: 'transactionDate', cell: ({ value }) => <span className="font-mono text-[10px] text-slate-500">{value ? new Date(value).toLocaleDateString('en-IN') : '—'}</span> },
        { header: 'Type', accessor: 'transactionType', cell: ({ value }) => <div className="flex items-center gap-1.5">{value === 'VAULT_IN' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}<span className={`text-xs font-bold ${value === 'VAULT_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{value === 'VAULT_IN' ? 'Cash In' : 'Cash Out'}</span></div> },
        { header: 'Amount (₹)', accessor: 'amount', cell: ({ value, row }) => <span className={`font-mono font-bold text-xs ${row.transactionType === 'VAULT_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{row.transactionType === 'VAULT_IN' ? '+' : '-'}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Balance Before', accessor: 'vaultBalanceBefore', cell: ({ value }) => <span className="font-mono text-xs text-slate-500">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Balance After', accessor: 'vaultBalanceAfter', cell: ({ value }) => <span className="font-mono font-bold text-xs text-indigo-650 dark:text-indigo-400">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Narration', accessor: 'narration', cell: ({ value }) => <span className="text-[11px] text-slate-500">{value || '—'}</span> },
        { header: 'Posted By', accessor: 'postedBy' },
      ];
    }
    if (reportType === 'performance') {
      return [
        { header: 'Teller', accessor: 'teller', cell: ({ value, row }) => <div><p className="font-bold text-xs">{value}</p><p className="text-[10px] text-slate-450">{row.email}</p></div> },
        { header: 'Total Sessions', accessor: 'totalSessions', cell: ({ value }) => <span className="font-mono font-bold text-xs text-indigo-650">{value}</span> },
        { header: 'Total Opening Cash', accessor: 'totalOpeningBalance', cell: ({ value }) => <span className="font-mono text-xs">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Total Difference (₹)', accessor: 'totalDifference', cell: ({ value }) => <span className={`font-mono font-bold text-xs ${value !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{value >= 0 ? '+' : ''}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Avg Difference (₹)', accessor: 'avgDifference', cell: ({ value }) => <span className={`font-mono text-xs ${value !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{value >= 0 ? '+' : ''}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
      ];
    }
    return [];
  };

  const handleExport = () => {
    const rows = getRows();
    const cols = getColumns().map((c) => ({
      header: c.header,
      accessor: c.accessor,
    }));
    exportToCSV(rows, cols, `Noble-Teller-Report-${reportType}.csv`);
  };

  const summary = reportData?.summary;
  const rows = getRows();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/teller')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-650"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Teller & Cash Reports"
          subtitle="Daily cash position, vault ledger, and teller performance analytics for Noble Cooperative Bank."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Teller Ops', href: '/dashboard/teller' },
            { label: 'Reports', href: '#' },
          ]}
        />
      </div>

      {/* Control Panel */}
      <CardWrapper className="p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">

            {/* Report Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => { setReportType(e.target.value); setReportData(null); }}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="daily">Daily Cash Position</option>
                <option value="vault">Vault Transaction Ledger</option>
                <option value="performance">Teller Performance Summary</option>
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Branch Filter</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
            </div>

            {/* Date inputs */}
            {reportType === 'daily' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Session Date *</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>
            )}

            {(reportType === 'vault' || reportType === 'performance') && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </CardWrapper>

      {/* Summary Metrics (Daily) */}
      {reportType === 'daily' && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <CardWrapper className="p-4 border-l-4 border-indigo-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Sessions</p>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{summary.totalSessions}</p>
            <p className="text-[10px] text-slate-450 mt-1">{summary.openSessions} open · {summary.closedSessions} closed</p>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-emerald-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Deposits</p>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-1">₹{summary.totalDeposits?.toLocaleString('en-IN')}</p>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-rose-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Withdrawals</p>
            <p className="text-xl font-bold font-mono text-rose-600 mt-1">₹{summary.totalWithdrawals?.toLocaleString('en-IN')}</p>
          </CardWrapper>
          <CardWrapper className={`p-4 border-l-4 ${summary.totalDifference !== 0 ? 'border-amber-500' : 'border-slate-300'}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Cash Difference</p>
            <p className={`text-xl font-bold font-mono mt-1 ${summary.totalDifference !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {summary.totalDifference >= 0 ? '+' : ''}₹{summary.totalDifference?.toLocaleString('en-IN')}
            </p>
          </CardWrapper>
        </div>
      )}

      {/* Summary Metrics (Vault) */}
      {reportType === 'vault' && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <CardWrapper className="p-4 border-l-4 border-violet-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Current Vault Balance</p>
            <p className="text-xl font-bold font-mono text-violet-650 dark:text-violet-400 mt-1">
              {summary.currentBalance !== null ? `₹${summary.currentBalance?.toLocaleString('en-IN')}` : '—'}
            </p>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-emerald-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Vault In</p>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-1">₹{summary.totalVaultIn?.toLocaleString('en-IN')}</p>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-rose-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Vault Out</p>
            <p className="text-xl font-bold font-mono text-rose-600 mt-1">₹{summary.totalVaultOut?.toLocaleString('en-IN')}</p>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-indigo-500">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Transactions</p>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{summary.transactionCount}</p>
          </CardWrapper>
        </div>
      )}

      {/* Main data table */}
      <CardWrapper className="p-5">
        <DataTable
          columns={getColumns()}
          data={rows}
          loading={loading}
        />
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-450">
          <p>Showing {rows.length} records</p>
        </div>
      </CardWrapper>
    </div>
  );
}
