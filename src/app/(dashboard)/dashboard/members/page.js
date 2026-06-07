'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Download, 
  Eye,
  Users,
  Filter,
  RefreshCw
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
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

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/members?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      if (branchFilter) url += `&branchId=${branchFilter}`;
      if (statusFilter) url += `&memberStatus=${statusFilter}`;
      if (kycFilter) url += `&kycStatus=${kycFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setMembers(json.data || []);
        setTotalPages(json.meta?.pages || 1);
        setTotalRecords(json.meta?.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch members:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, branchFilter, statusFilter, kycFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleExport = () => {
    const cols = [
      { header: 'Member No', accessor: 'memberNo' },
      { header: 'Full Name', accessor: 'fullName' },
      { header: 'Branch', accessor: (row) => row.branchId?.branchName || 'N/A' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Email', accessor: 'email' },
      { header: 'Category', accessor: 'memberCategory' },
      { header: 'KYC Status', accessor: 'kycStatus' },
      { header: 'Status', accessor: 'memberStatus' },
      { header: 'Date of Birth', accessor: 'dateOfBirth' },
    ];
    exportToCSV(members, cols, 'Noble-Members-Register.csv');
  };

  const columns = [
    {
      header: 'Member No',
      accessor: 'memberNo',
      cell: ({ value }) => (
        <span className="font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
          {value}
        </span>
      ),
    },
    {
      header: 'Member Details',
      accessor: 'fullName',
      cell: ({ value, row }) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-[11px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">
            {row.email || 'No Email'} • {row.memberCategory?.toUpperCase()}
          </p>
        </div>
      ),
    },
    {
      header: 'Contact / Mobile',
      accessor: 'mobile',
      cell: ({ value }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
          {value}
        </span>
      ),
    },
    {
      header: 'Branch',
      cell: ({ row }) => (
        <span className="text-xs text-slate-800 dark:text-slate-200">
          {row.branchId?.branchName || 'N/A'}
        </span>
      ),
    },
    {
      header: 'KYC Status',
      accessor: 'kycStatus',
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Account Status',
      accessor: 'memberStatus',
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/dashboard/members/${row._id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-750 dark:text-slate-250 border border-slate-200 dark:border-slate-850 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 transition-all text-xs font-bold rounded-xl cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          View Profile
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Management"
        subtitle="Search, register, view, and manage lifecycle configurations of banking cooperative members."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Members', href: '#' },
        ]}
        action={
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => router.push('/dashboard/members/create')}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
            >
              <Plus className="w-4 h-4" />
              Register Member
            </button>
          </div>
        }
      />

      <CardWrapper className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, member number, PAN, Aadhaar..."
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

            {/* KYC Filter */}
            <select
              value={kycFilter}
              onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All KYC Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Account Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
              <option value="deceased">Deceased</option>
            </select>

            <button
              onClick={fetchMembers}
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={members}
          loading={loading}
          onRowClick={(row) => router.push(`/dashboard/members/${row._id}`)}
        />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-450 dark:text-slate-500">
            Showing {members.length} of {totalRecords} registered members
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
