'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Download, 
  Eye,
  Wallet,
  Filter,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function SavingsAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch branches for dropdown filter
  useEffect(() => {
    async function fetchBranches() {
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
    fetchBranches();
  }, []);

  // Fetch savings accounts
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/savings-accounts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      if (branchFilter) url += `&branchId=${branchFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&accountType=${typeFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.data || []);
        setTotalPages(json.meta?.pages || 1);
        setTotalRecords(json.meta?.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch savings accounts:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, branchFilter, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleExport = () => {
    const cols = [
      { header: 'Account No', accessor: 'accountNo' },
      { header: 'Member Name', accessor: (row) => row.memberId?.fullName || 'N/A' },
      { header: 'Branch', accessor: (row) => row.branchId?.branchName || 'N/A' },
      { header: 'Account Type', accessor: 'accountType' },
      { header: 'Interest Rate (%)', accessor: 'interestRate' },
      { header: 'Minimum Balance', accessor: 'minimumBalance' },
      { header: 'Current Balance (₹)', accessor: 'currentBalance' },
      { header: 'Available Balance (₹)', accessor: 'availableBalance' },
      { header: 'Status', accessor: 'status' },
      { header: 'Opening Date', accessor: 'openingDate' },
    ];
    exportToCSV(accounts, cols, 'Noble-Savings-Register.csv');
  };

  const columns = [
    {
      header: 'Account No',
      accessor: 'accountNo',
      cell: ({ value }) => (
        <span className="font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
          {value}
        </span>
      ),
    },
    {
      header: 'Member Name',
      accessor: 'memberId',
      cell: ({ value }) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{value?.fullName || 'N/A'}</p>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">
            {value?.memberNo || 'N/A'} • {value?.mobile || 'No Mobile'}
          </p>
        </div>
      ),
    },
    {
      header: 'Branch',
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {row.branchId?.branchName || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: 'accountType',
      cell: ({ value }) => (
        <span className="text-xs text-slate-800 dark:text-slate-200 capitalize">
          {value?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Interest Rate',
      accessor: 'interestRate',
      cell: ({ value }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
          {value}% p.a.
        </span>
      ),
    },
    {
      header: 'Balances',
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-450 font-mono">
            ₹{row.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-450 dark:text-slate-505 font-mono">
            Avail: ₹{row.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/dashboard/savings-accounts/${row._id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-750 dark:text-slate-250 border border-slate-200 dark:border-slate-850 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 transition-all text-xs font-bold rounded-xl cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Manage Hub
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action shortcuts bar */}
      <PageHeader
        title="Savings Accounts"
        subtitle="Manage member savings accounts, daily teller deposits, withdrawals, interest postings, and statements."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Savings', href: '#' },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/dashboard/savings-accounts/deposit')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-650/15"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              Deposit
            </button>
            <button
              onClick={() => router.push('/dashboard/savings-accounts/withdraw')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-650 hover:bg-amber-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-amber-650/15"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Withdraw
            </button>
            <button
              onClick={() => router.push('/dashboard/savings-interest')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer"
            >
              <Percent className="w-3.5 h-3.5" />
              Interest Post
            </button>
            <button
              onClick={() => router.push('/dashboard/savings-reports')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Reports
            </button>
            <button
              onClick={() => router.push('/dashboard/savings-accounts/open')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
            >
              <Plus className="w-4 h-4" />
              Open Account
            </button>
          </div>
        }
      />

      {/* Registers Filter panel */}
      <CardWrapper className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by account number, member name or mobile..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Types</option>
              <option value="regular">Regular</option>
              <option value="staff">Staff</option>
              <option value="senior_citizen">Senior Citizen</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
              <option value="dormant">Dormant</option>
              <option value="closed">Closed</option>
            </select>

            <button
              onClick={fetchAccounts}
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={accounts}
          loading={loading}
          onRowClick={(row) => router.push(`/dashboard/savings-accounts/${row._id}`)}
        />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-450 dark:text-slate-500">
            Showing {accounts.length} of {totalRecords} accounts
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </CardWrapper>
    </div>
  );
}
