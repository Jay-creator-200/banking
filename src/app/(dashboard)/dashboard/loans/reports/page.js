'use client';

import React, { useState } from 'react';
import { BarChart2, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

const REPORT_TYPES = [
  { value: 'register', label: 'Loan Register', icon: '📋' },
  { value: 'disbursement', label: 'Disbursement Report', icon: '🏦' },
  { value: 'collection', label: 'EMI Collection Report', icon: '💰' },
  { value: 'overdue', label: 'Overdue Report', icon: '⚠️' },
  { value: 'product', label: 'Product-wise Summary', icon: '📊' },
  { value: 'branch', label: 'Branch-wise Summary', icon: '🏢' },
];

export default function LoanReportsPage() {
  const [reportType, setReportType] = useState('register');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/api/loan-reports?reportType=${reportType}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res = await fetch(url);
      if (res.ok) { const json = await res.json(); setData(json.data); }
    } finally { setLoading(false); }
  };

  const renderTable = () => {
    if (!data) return null;
    let columns = [];
    let rows = [];

    if (reportType === 'register' || reportType === 'disbursement') {
      rows = data?.loans || data || [];
      columns = [
        { header: 'Loan No', accessor: 'loanNo', cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 px-2 py-0.5 rounded-lg">{value}</span> },
        { header: 'Member', accessor: 'memberId', cell: ({ value }) => <span className="text-xs font-semibold">{value?.fullName || '—'}</span> },
        { header: 'Product', accessor: 'loanProductId', cell: ({ value }) => <span className="text-xs text-slate-600">{value?.productName || '—'}</span> },
        { header: 'Branch', accessor: 'branchId', cell: ({ value }) => <span className="text-xs">{value?.branchName || '—'}</span> },
        { header: 'Principal', accessor: 'principalAmount', cell: ({ value }) => <span className="font-mono font-bold text-xs">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Outstanding', accessor: 'outstandingPrincipal', cell: ({ value }) => <span className="font-mono text-xs text-indigo-650">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Status', accessor: 'loanStatus', cell: ({ value }) => <span className="text-[10px] font-bold uppercase">{value?.replace('_', ' ')}</span> },
        { header: 'Date', accessor: 'disbursementDate', cell: ({ value }) => <span className="font-mono text-[10px] text-slate-450">{value ? new Date(value).toLocaleDateString('en-IN') : '—'}</span> },
      ];
    } else if (reportType === 'collection') {
      rows = data?.payments || [];
      columns = [
        { header: 'Loan No', cell: ({ row }) => <span className="font-mono text-[11px] font-bold text-indigo-650">{row.loanId?.loanNo}</span> },
        { header: 'Member', cell: ({ row }) => <span className="text-xs">{row.loanId?.memberId?.fullName || '—'}</span> },
        { header: 'Amount', accessor: 'amount', cell: ({ value }) => <span className="font-mono font-bold text-xs text-emerald-700">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Principal', accessor: 'principalCollected', cell: ({ value }) => <span className="font-mono text-xs">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Interest', accessor: 'interestCollected', cell: ({ value }) => <span className="font-mono text-xs">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Penalty', accessor: 'penaltyCollected', cell: ({ value }) => <span className="font-mono text-xs text-rose-600">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Mode', accessor: 'paymentMode', cell: ({ value }) => <span className="text-[10px] font-bold">{value}</span> },
        { header: 'Date', accessor: 'paymentDate', cell: ({ value }) => <span className="font-mono text-[10px] text-slate-450">{value ? new Date(value).toLocaleDateString('en-IN') : '—'}</span> },
      ];
    } else if (reportType === 'overdue') {
      rows = data?.loans || [];
      columns = [
        { header: 'Loan No', accessor: 'loanNo', cell: ({ value }) => <span className="font-mono text-[11px] font-bold text-rose-700">{value}</span> },
        { header: 'Member', accessor: 'memberId', cell: ({ value }) => <span className="text-xs font-semibold">{value?.fullName || '—'}</span> },
        { header: 'Outstanding', accessor: 'outstandingPrincipal', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-700">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Overdue Amt', accessor: 'overdueAmount', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-700">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Installments', accessor: 'overdueInstallments', cell: ({ value }) => <span className="font-mono text-xs">{value} overdue</span> },
        { header: 'Max Days', accessor: 'maxDaysOverdue', cell: ({ value }) => <span className={`font-mono font-bold text-xs ${value > 90 ? 'text-rose-700' : 'text-amber-600'}`}>{value}d</span> },
      ];
    } else if (reportType === 'product') {
      rows = data || [];
      columns = [
        { header: 'Product', accessor: 'product', cell: ({ value }) => <span className="font-bold text-xs">{value}</span> },
        { header: 'Code', accessor: 'productCode', cell: ({ value }) => <span className="font-mono text-[11px] text-indigo-650">{value}</span> },
        { header: 'Total Loans', accessor: 'totalLoans', cell: ({ value }) => <span className="font-mono font-bold text-xs">{value}</span> },
        { header: 'Disbursed', accessor: 'totalDisbursed', cell: ({ value }) => <span className="font-mono font-bold text-xs">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Outstanding', accessor: 'totalOutstanding', cell: ({ value }) => <span className="font-mono text-xs text-indigo-650">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Active', accessor: 'activeCount', cell: ({ value }) => <span className="font-mono text-xs text-emerald-700">{value}</span> },
        { header: 'Overdue', accessor: 'overdueCount', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-700">{value}</span> },
      ];
    } else if (reportType === 'branch') {
      rows = data || [];
      columns = [
        { header: 'Branch', accessor: 'branch', cell: ({ value }) => <span className="font-bold text-xs">{value}</span> },
        { header: 'Code', accessor: 'branchCode', cell: ({ value }) => <span className="font-mono text-[11px] text-indigo-650">{value}</span> },
        { header: 'Total Loans', accessor: 'totalLoans', cell: ({ value }) => <span className="font-mono font-bold text-xs">{value}</span> },
        { header: 'Disbursed', accessor: 'totalDisbursed', cell: ({ value }) => <span className="font-mono font-bold text-xs">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Outstanding', accessor: 'totalOutstanding', cell: ({ value }) => <span className="font-mono text-xs text-indigo-650">₹{value?.toLocaleString('en-IN')}</span> },
        { header: 'Overdue', accessor: 'overdueCount', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-700">{value}</span> },
      ];
    }

    // Summary panel for register/collection
    const summary = reportType === 'register' ? data?.summary : reportType === 'collection' ? data?.summary : reportType === 'overdue' ? data?.summary : null;

    return (
      <div className="space-y-4">
        {summary && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center border border-slate-200 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{typeof v === 'number' && v > 1000 ? `₹${v.toLocaleString('en-IN')}` : v}</p>
              </div>
            ))}
          </div>
        )}
        <DataTable columns={columns} data={rows} />
        <div className="flex justify-end">
          <button onClick={() => exportToCSV(rows, columns, `${reportType}-report.csv`)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>
    );
  };

  const inputCls = 'px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Reports"
        subtitle="Generate comprehensive loan reports for Noble Cooperative Bank."
        breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Reports', href: '#' }]}
      />

      {/* Report Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {REPORT_TYPES.map((r) => (
          <button key={r.value} onClick={() => { setReportType(r.value); setData(null); }} className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl border cursor-pointer transition-all ${reportType === r.value ? 'bg-indigo-650 text-white border-indigo-650' : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}>
            <span>{r.icon}</span> {r.label}
          </button>
        ))}
      </div>

      <CardWrapper className="p-5 space-y-5">
        {/* Filters */}
        <div className="flex items-end gap-3 flex-wrap">
          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">From Date</label><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">To Date</label><input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <button onClick={fetchReport} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Generate
          </button>
        </div>

        {/* Results */}
        {loading && <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && data && renderTable()}
        {!loading && !data && <p className="text-center text-xs text-slate-400 py-8">Select parameters and click Generate to view report.</p>}
      </CardWrapper>
    </div>
  );
}
