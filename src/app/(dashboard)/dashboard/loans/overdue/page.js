'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertOctagon, RefreshCw, Clock, IndianRupee, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';

export default function OverduePage() {
  const router = useRouter();
  const [data, setData] = useState({ loans: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchOverdue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/loan-reports?reportType=overdue');
      if (res.ok) { const json = await res.json(); setData(json.data || { loans: [], summary: {} }); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOverdue(); }, [fetchOverdue]);

  const runScan = async () => {
    setScanning(true); setMsg('');
    try {
      const res = await fetch('/api/loan-reports?action=overdue-scan', { method: 'POST' });
      const json = await res.json();
      if (res.ok) { setMsg(json.message || 'Scan complete'); fetchOverdue(); }
    } finally { setScanning(false); }
  };

  const columns = [
    { header: 'Loan No', accessor: 'loanNo', cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-700 px-2 py-0.5 rounded-lg">{value}</span> },
    { header: 'Member', accessor: 'memberId', cell: ({ value }) => <div><p className="font-bold text-xs">{value?.fullName}</p><p className="text-[10px] text-slate-450">{value?.memberNo}</p></div> },
    { header: 'Branch', accessor: 'branchId', cell: ({ value }) => <span className="text-xs text-slate-600 dark:text-slate-400">{value?.branchName || '—'}</span> },
    { header: 'Outstanding', accessor: 'outstandingPrincipal', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-700">₹{value?.toLocaleString('en-IN')}</span> },
    { header: 'Overdue Amt', accessor: 'overdueAmount', cell: ({ value }) => <span className="font-mono font-bold text-xs text-rose-700">₹{value?.toLocaleString('en-IN')}</span> },
    { header: 'Installments', accessor: 'overdueInstallments', cell: ({ value }) => <span className="font-mono text-xs text-slate-600">{value} overdue</span> },
    { header: 'Days', accessor: 'maxDaysOverdue', cell: ({ value }) => <span className={`font-mono font-bold text-xs ${value > 90 ? 'text-rose-700' : value > 30 ? 'text-amber-600' : 'text-slate-600'}`}>{value}d</span> },
    {
      header: '', cell: ({ row }) => (
        <button onClick={() => router.push(`/dashboard/loans/${row._id}`)} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 border border-rose-200 cursor-pointer"><ArrowRight className="w-3 h-3" /></button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overdue Management"
        subtitle="Monitor and manage overdue loan accounts across Noble Cooperative Bank."
        breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Overdue', href: '#' }]}
        action={
          <button onClick={runScan} disabled={scanning} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} /> {scanning ? 'Scanning...' : 'Run Overdue Scan'}
          </button>
        }
      />

      {msg && <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">{msg}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Overdue Loans', value: data.summary.totalLoans || 0, icon: AlertOctagon, color: 'bg-rose-600' },
          { label: 'Total Overdue Amount', value: `₹${(data.summary.totalOverdueAmount || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'bg-amber-600' },
          { label: 'Outstanding Principal', value: `₹${(data.summary.totalOutstandingPrincipal || 0).toLocaleString('en-IN')}`, icon: Clock, color: 'bg-slate-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <CardWrapper key={label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5 text-white" /></div>
            <div><p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p><p className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">{value}</p></div>
          </CardWrapper>
        ))}
      </div>

      <CardWrapper className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-rose-700">{data.loans?.length || 0} Overdue Accounts</p>
          <button onClick={fetchOverdue} className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <DataTable columns={columns} data={data.loans || []} loading={loading} />
      </CardWrapper>
    </div>
  );
}
