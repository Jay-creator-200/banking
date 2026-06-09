'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Search, Filter, Download, Eye, RefreshCw, TrendingDown, TrendingUp, AlertOctagon, CheckCheck } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';

const STATUS_STYLES = {
  active: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700',
  overdue: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700',
  closed: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  foreclosed: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700',
  written_off: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700',
};

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({});

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/loans?page=${page}&limit=15`;
      if (statusFilter) url += `&loanStatus=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLoans(json.data || []);
        setTotal(json.meta?.total || 0);
        setTotalPages(json.meta?.pages || 1);
      }
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const filteredLoans = loans.filter((l) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return l.loanNo?.toLowerCase().includes(s) || l.memberId?.fullName?.toLowerCase().includes(s) || l.memberId?.memberNo?.toLowerCase().includes(s);
  });

  const columns = [
    {
      header: 'Loan No', accessor: 'loanNo',
      cell: ({ value }) => <span className="font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-lg">{value}</span>,
    },
    {
      header: 'Member', accessor: 'memberId',
      cell: ({ value }) => <div><p className="font-bold text-xs text-slate-900 dark:text-slate-100">{value?.fullName || '—'}</p><p className="text-[10px] text-slate-450">{value?.memberNo}</p></div>,
    },
    {
      header: 'Product', accessor: 'loanProductId',
      cell: ({ value }) => <span className="text-xs text-slate-600 dark:text-slate-400">{value?.productName || '—'}</span>,
    },
    {
      header: 'Principal', accessor: 'principalAmount',
      cell: ({ value }) => <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">₹{value?.toLocaleString('en-IN')}</span>,
    },
    {
      header: 'Outstanding', accessor: 'outstandingPrincipal',
      cell: ({ value }) => <span className="font-mono font-bold text-xs text-indigo-650 dark:text-indigo-400">₹{value?.toLocaleString('en-IN')}</span>,
    },
    {
      header: 'EMI', accessor: 'emiAmount',
      cell: ({ value }) => <span className="font-mono text-[11px] text-slate-600">₹{value?.toLocaleString('en-IN')}</span>,
    },
    {
      header: 'Next Due', accessor: 'nextDueDate',
      cell: ({ value, row }) => {
        if (!value) return <span className="text-slate-400 text-xs">—</span>;
        const isOverdue = new Date(value) < new Date();
        return <span className={`font-mono text-[10px] font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>{new Date(value).toLocaleDateString('en-IN')}</span>;
      },
    },
    {
      header: 'Status', accessor: 'loanStatus',
      cell: ({ value }) => <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${STATUS_STYLES[value] || ''}`}>{value?.replace('_', ' ')}</span>,
    },
    {
      header: '', cell: ({ row }) => (
        <button onClick={() => router.push(`/dashboard/loans/${row._id}`)} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-indigo-600 border border-indigo-100 dark:border-indigo-900 cursor-pointer">
          <Eye className="w-3 h-3" />
        </button>
      ),
    },
  ];

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <CardWrapper className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
      <div><p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p><p className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">{value}</p></div>
    </CardWrapper>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Loans"
        subtitle="Loan register for Noble Cooperative Bank — track disbursements, EMIs, and outstanding balances."
        breadcrumbs={[{ label: 'Loans', href: '#' }]}
        action={
          <button onClick={() => router.push('/dashboard/loans/disbursement')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm">
            <Landmark className="w-4 h-4" /> New Disbursement
          </button>
        }
      />

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All', value: '' },
          { label: 'Active', value: 'active' },
          { label: 'Overdue', value: 'overdue' },
          { label: 'Closed', value: 'closed' },
          { label: 'Foreclosed', value: 'foreclosed' },
          { label: 'Written Off', value: 'written_off' },
        ].map((s) => (
          <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1); }} className={`px-3 py-1.5 text-[11px] font-bold rounded-xl border cursor-pointer transition-all ${statusFilter === s.value ? 'bg-indigo-650 text-white border-indigo-650' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}>{s.label}</button>
        ))}
      </div>

      <CardWrapper className="p-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search loans..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => router.push('/dashboard/loans/overdue')} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"><AlertOctagon className="w-3 h-3" /> Overdue</button>
            <button onClick={() => router.push('/dashboard/loans/collections')} className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl cursor-pointer"><CheckCheck className="w-3 h-3" /> Collections</button>
            <button onClick={fetchLoans} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-500">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <DataTable columns={columns} data={filteredLoans} loading={loading} />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-450">Showing {filteredLoans.length} of {total}</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </CardWrapper>
    </div>
  );
}
