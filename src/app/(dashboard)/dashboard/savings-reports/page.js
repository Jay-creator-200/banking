'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText, 
  AlertCircle, 
  Download,
  Printer,
  Calendar,
  Building,
  RefreshCw,
  TrendingDown,
  Info
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function SavingsReportsPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selection States
  const [reportType, setReportType] = useState('register');
  const [branchId, setBranchId] = useState('');
  
  // Parameter States
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data States
  const [reportData, setReportData] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches?limit=100');
        if (res.ok) {
          const json = await res.json();
          setBranches(json.data || []);
        }
      } catch (e) {
        console.error('Failed to load branches:', e);
      }
    }
    loadBranches();
  }, []);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReportData([]);
    setDailySummary(null);

    try {
      let url = `/api/savings-reports?reportType=${reportType}`;
      if (branchId) url += `&branchId=${branchId}`;

      if (reportType === 'daily-transactions' && singleDate) {
        url += `&date=${singleDate}`;
      } else if (reportType === 'openings' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        if (reportType === 'daily-transactions') {
          setReportData(json.data?.transactions || []);
          setDailySummary(json.data?.summary || null);
        } else {
          setReportData(json.data || []);
        }
      }
    } catch (e) {
      console.error('Failed to compile report data:', e);
    } finally {
      setLoading(false);
    }
  }, [reportType, branchId, singleDate, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle CSV Export
  const handleExport = () => {
    let cols = [];
    let filename = `Noble-Savings-Report-${reportType}.csv`;

    if (reportType === 'register') {
      cols = [
        { header: 'Account No', accessor: 'accountNo' },
        { header: 'Member Name', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Account Type', accessor: 'accountType' },
        { header: 'Interest Rate (%)', accessor: 'interestRate' },
        { header: 'Current Balance (₹)', accessor: 'currentBalance' },
        { header: 'Status', accessor: 'status' },
        { header: 'Opening Date', accessor: 'openingDate' },
      ];
    } else if (reportType === 'daily-transactions') {
      cols = [
        { header: 'Txn No', accessor: 'transactionNo' },
        { header: 'Account No', accessor: 'accountNo' },
        { header: 'Member Name', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Type', accessor: 'transactionType' },
        { header: 'Payment Mode', accessor: 'paymentMode' },
        { header: 'Amount (₹)', accessor: 'amount' },
        { header: 'Narration', accessor: 'narration' },
      ];
    } else if (reportType === 'dormant' || reportType === 'frozen') {
      cols = [
        { header: 'Account No', accessor: 'accountNo' },
        { header: 'Member Name', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Balance (₹)', accessor: 'balance' },
        { header: 'Last Active/Update', accessor: (row) => row.lastActive || row.frozenAt },
        { header: 'Reason (If Frozen)', accessor: 'freezeReason' },
      ];
    } else if (reportType === 'closed') {
      cols = [
        { header: 'Account No', accessor: 'accountNo' },
        { header: 'Member Name', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Closed At', accessor: 'closedAt' },
        { header: 'Closed By', accessor: 'closedByName' },
      ];
    } else if (reportType === 'openings') {
      cols = [
        { header: 'Account No', accessor: 'accountNo' },
        { header: 'Member Name', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Account Type', accessor: 'accountType' },
        { header: 'Opening Date', accessor: 'openingDate' },
        { header: 'Opening Balance (₹)', accessor: 'openingBalance' },
      ];
    }

    exportToCSV(reportData, cols, filename);
  };

  // Columns for UI DataTable
  const getColumns = () => {
    if (reportType === 'register') {
      return [
        { header: 'Account No', accessor: 'accountNo', cell: ({ value }) => <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[11px]">{value}</span> },
        { header: 'Member Name', accessor: 'memberName', cell: ({ value, row }) => <div><p className="font-bold">{value}</p><p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.memberNo}</p></div> },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Account Type', accessor: 'accountType', cell: ({ value }) => <span className="capitalize">{value}</span> },
        { header: 'Ledger Balance', accessor: 'currentBalance', cell: ({ value }) => <span className="font-mono font-bold text-emerald-600">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: 'Status', accessor: 'status', cell: ({ value }) => <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">{value}</span> },
      ];
    }

    if (reportType === 'daily-transactions') {
      return [
        { header: 'Txn No', accessor: 'transactionNo', cell: ({ value }) => <span className="font-mono font-bold text-[10px]">{value}</span> },
        { header: 'Account No', accessor: 'accountNo', cell: ({ value }) => <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[11px]">{value}</span> },
        { header: 'Member Details', accessor: 'memberName' },
        { header: 'Type', accessor: 'transactionType', cell: ({ value }) => <span className="capitalize font-semibold">{value?.replace('SAVINGS_', '').replace('_', ' ')}</span> },
        { header: 'Mode', accessor: 'paymentMode' },
        { header: 'Amount', accessor: 'amount', cell: ({ value, row }) => <span className={`font-mono font-bold ${row.transactionType === 'SAVINGS_WITHDRAWAL' ? 'text-rose-600' : 'text-emerald-600'}`}>₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
      ];
    }

    if (reportType === 'dormant' || reportType === 'frozen') {
      return [
        { header: 'Account No', accessor: 'accountNo', cell: ({ value }) => <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[11px]">{value}</span> },
        { header: 'Member Details', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Ledger Balance', accessor: 'balance', cell: ({ value }) => <span className="font-mono font-bold">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
        { header: reportType === 'dormant' ? 'Last Active' : 'Frozen Date', accessor: (row) => row.lastActive || row.frozenAt, cell: ({ value }) => <span className="font-mono text-[10px] text-slate-500">{new Date(value).toLocaleDateString()}</span> },
        ...(reportType === 'frozen' ? [{ header: 'Reason', accessor: 'freezeReason', cell: ({ value }) => <span className="capitalize text-rose-600 font-semibold">{value?.replace('_', ' ')}</span> }] : []),
      ];
    }

    if (reportType === 'closed') {
      return [
        { header: 'Account No', accessor: 'accountNo', cell: ({ value }) => <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[11px]">{value}</span> },
        { header: 'Member Details', accessor: 'memberName' },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Closed Date', accessor: 'closedAt', cell: ({ value }) => <span className="font-mono text-[10px] text-slate-500">{new Date(value).toLocaleDateString()}</span> },
        { header: 'Authorized By', accessor: 'closedByName' },
      ];
    }

    if (reportType === 'openings') {
      return [
        { header: 'Account No', accessor: 'accountNo', cell: ({ value }) => <span className="font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[11px]">{value}</span> },
        { header: 'Member Details', accessor: 'memberName' },
        { header: 'Account Type', accessor: 'accountType', cell: ({ value }) => <span className="capitalize">{value}</span> },
        { header: 'Branch', accessor: 'branchName' },
        { header: 'Opening Date', accessor: 'openingDate', cell: ({ value }) => <span className="font-mono text-[10px] text-slate-500">{new Date(value).toLocaleDateString()}</span> },
        { header: 'Opening Balance', accessor: 'openingBalance', cell: ({ value }) => <span className="font-mono font-bold text-emerald-600">₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
      ];
    }

    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/savings-accounts')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-650"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Savings Core Reports Console"
          subtitle="Generate, review, and print primary banking registers, transaction listings, and lifecycle rosters."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Savings', href: '/dashboard/savings-accounts' },
            { label: 'Reports', href: '#' },
          ]}
        />
      </div>

      {/* Control panel card */}
      <CardWrapper className="p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            {/* Report Type Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Report Category</label>
              <select
                value={reportType}
                onChange={e => { setReportType(e.target.value); setReportData([]); setDailySummary(null); }}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="register">Primary Accounts Register</option>
                <option value="daily-transactions">Daily Posted Transactions</option>
                <option value="dormant">Dormant Accounts Roster</option>
                <option value="frozen">Frozen Accounts Roster</option>
                <option value="closed">Closed Accounts Roster</option>
                <option value="openings">New Account Openings Register</option>
              </select>
            </div>

            {/* Home Branch Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Branch Filter</label>
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Date Inputs */}
            {reportType === 'daily-transactions' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Transaction Date *</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>
            )}

            {reportType === 'openings' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </>
            )}
          </div>

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
              disabled={loading || reportData.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              disabled={loading || reportData.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </CardWrapper>

      {/* Daily transaction summaries metrics panel */}
      {reportType === 'daily-transactions' && dailySummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardWrapper className="p-4 border-l-4 border-emerald-500">
            <span className="block text-[10px] text-slate-450 uppercase font-bold">Total Cash Deposits</span>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-1">₹{dailySummary.deposits?.total?.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-slate-450 block mt-1">Slip Count: {dailySummary.deposits?.count}</span>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-rose-500">
            <span className="block text-[10px] text-slate-450 uppercase font-bold">Total Cash Withdrawals</span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-1">₹{dailySummary.withdrawals?.total?.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-slate-450 block mt-1">Voucher Count: {dailySummary.withdrawals?.count}</span>
          </CardWrapper>
          <CardWrapper className="p-4 border-l-4 border-indigo-500">
            <span className="block text-[10px] text-slate-450 uppercase font-bold">Total Interest Posted</span>
            <p className="text-xl font-bold font-mono text-indigo-650 mt-1">₹{dailySummary.interestCredits?.total?.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-slate-450 block mt-1">Voucher Count: {dailySummary.interestCredits?.count}</span>
          </CardWrapper>
        </div>
      )}

      {/* Main Report Results List */}
      <CardWrapper className="p-5">
        <DataTable
          columns={getColumns()}
          data={reportData}
          loading={loading}
        />
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-450">
          <p>Showing {reportData.length} records compiled</p>
        </div>
      </CardWrapper>
    </div>
  );
}
