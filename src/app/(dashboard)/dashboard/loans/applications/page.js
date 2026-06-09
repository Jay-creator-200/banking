'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, RefreshCw, Eye, CheckCircle2, XCircle, Clock, Filter, Download, Send, Search
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

const STATUS_COLORS = {
  draft: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  submitted: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  under_review: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700',
  approved: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700',
  rejected: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700',
};

export default function LoanApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/loan-applications?page=${page}&limit=15`;
      if (statusFilter) url += `&applicationStatus=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setApplications(json.data || []);
        setTotal(json.meta?.total || 0);
        setTotalPages(json.meta?.pages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const filteredApps = applications.filter((a) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      a.applicationNo?.toLowerCase().includes(s) ||
      a.memberId?.fullName?.toLowerCase().includes(s) ||
      a.memberId?.memberNo?.toLowerCase().includes(s)
    );
  });

  const columns = [
    {
      header: 'App No', accessor: 'applicationNo',
      cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-lg">{value}</span>,
    },
    {
      header: 'Member', accessor: 'memberId',
      cell: ({ value }) => <div><p className="font-bold text-xs text-slate-900 dark:text-slate-100">{value?.fullName || '—'}</p><p className="text-[10px] text-slate-450">{value?.memberNo}</p></div>,
    },
    {
      header: 'Product', accessor: 'loanProductId',
      cell: ({ value }) => <span className="text-xs text-slate-700 dark:text-slate-300">{value?.productName || '—'}</span>,
    },
    {
      header: 'Requested', accessor: 'requestedAmount',
      cell: ({ value }) => <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">₹{value?.toLocaleString('en-IN')}</span>,
    },
    {
      header: 'Tenure', accessor: 'requestedTenureMonths',
      cell: ({ value }) => <span className="text-xs text-slate-500">{value} mo</span>,
    },
    {
      header: 'Status', accessor: 'applicationStatus',
      cell: ({ value }) => <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${STATUS_COLORS[value] || ''}`}>{value?.replace('_', ' ')}</span>,
    },
    {
      header: 'Date', accessor: 'applicationDate',
      cell: ({ value }) => <span className="font-mono text-[10px] text-slate-450">{value ? new Date(value).toLocaleDateString('en-IN') : '—'}</span>,
    },
    {
      header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/dashboard/loans/applications/${row._id}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-indigo-650 hover:text-white transition-all rounded-lg cursor-pointer"
          >
            <Eye className="w-3 h-3" /> Review
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Applications"
        subtitle="Manage member loan applications from draft through approval for Noble Cooperative Bank."
        breadcrumbs={[{ label: 'Loans', href: '/dashboard/loans' }, { label: 'Applications', href: '#' }]}
        action={
          <button
            onClick={() => router.push('/dashboard/loans/applications/new')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Application
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'All', value: '', count: total, color: 'border-slate-300' },
          { label: 'Draft', value: 'draft', color: 'border-slate-400' },
          { label: 'Submitted', value: 'submitted', color: 'border-blue-500' },
          { label: 'Under Review', value: 'under_review', color: 'border-amber-500' },
          { label: 'Approved', value: 'approved', color: 'border-emerald-500' },
        ].map((s) => (
          <button key={s.value}
            onClick={() => { setStatusFilter(s.value); setPage(1); }}
            className={`p-3 text-left border-l-4 ${s.color} bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all ${statusFilter === s.value ? 'ring-2 ring-indigo-500/30' : ''}`}
          >
            <p className="text-[9px] font-bold text-slate-500 uppercase">{s.label}</p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">{s.count}</p>
          </button>
        ))}
      </div>

      <CardWrapper className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, number..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchApplications} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-500">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => exportToCSV(filteredApps, [
              { header: 'App No', accessor: 'applicationNo' },
              { header: 'Member', accessor: (r) => r.memberId?.fullName },
              { header: 'Amount', accessor: 'requestedAmount' },
              { header: 'Status', accessor: 'applicationStatus' },
            ], 'Loan-Applications.csv')} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-500">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <DataTable columns={columns} data={filteredApps} loading={loading} />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-450">Showing {filteredApps.length} of {total}</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </CardWrapper>
    </div>
  );
}
