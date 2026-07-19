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
  RefreshCw,
  Upload
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
  const [showImport, setShowImport] = useState(false);
  const [importBranchId, setImportBranchId] = useState('');
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Fetch branches for dropdown filter
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches?limit=100');
        if (res.ok) {
          const json = await res.json();
          setBranches(json.data || []);
          if (json.data?.[0]) setImportBranchId(json.data[0]._id);
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

  const parseCsv = (text) => {
    const rows = [];
    let current = '';
    let row = [];
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(current);
        current = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(current);
        if (row.some((cell) => cell.trim() !== '')) rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()])));
  };

  const formatImportDetails = (details) => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    return Object.entries(details)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join('; ');
  };

  const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const loadImportText = (text) => {
    setImportError('');
    setImportResult(null);
    try {
      const trimmed = text.trim();
      const rows = trimmed.startsWith('[') ? JSON.parse(trimmed) : parseCsv(trimmed);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows found. Use CSV with headers or a JSON array.');
      setImportRows(rows);
    } catch (error) {
      setImportRows([]);
      setImportError(error.message);
    }
  };

  const downloadImportSample = () => {
    const headers = [
      'fullName', 'fatherName', 'motherName', 'dateOfBirth', 'gender', 'mobile', 'email',
      'aadhaarNumber', 'panNumber', 'addressLine1', 'city', 'district', 'state', 'pincode',
      'memberCategory', 'membershipDate', 'memberNo', 'annualIncome',
    ];
    const sample = [
      'Ramesh Kumar', 'Suresh Kumar', 'Kamla Devi', '1985-04-12', 'MALE', '9876543210', 'ramesh@example.com',
      '123456789012', 'ABCDE1234F', '12 Main Road', 'Udaipur', 'Udaipur', 'Rajasthan', '313001',
      'general', '2026-07-19', '101', '250000',
    ];
    const csv = `${headers.map(csvEscape).join(',')}\n${sample.map(csvEscape).join(',')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member-import-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitImport = async () => {
    setImportError('');
    setImportResult(null);
    if (!importBranchId) {
      setImportError('Select default branch before import.');
      return;
    }
    if (importRows.length === 0) {
      setImportError('Upload or paste member rows first.');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: importBranchId, rows: importRows }),
      });
      const json = await res.json();
      if (!res.ok && !json.data) throw new Error(json.error?.message || 'Import failed');
      setImportResult(json.data);
      fetchMembers();
    } catch (error) {
      setImportError(error.message);
    } finally {
      setImporting(false);
    }
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
              onClick={() => { setShowImport(!showImport); setImportError(''); setImportResult(null); }}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Members
            </button>
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

      {showImport && (
        <CardWrapper className="p-5 space-y-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Bulk Member Import</h3>
              <p className="text-xs text-slate-500 mt-1">CSV/JSON rows are imported through the normal registration logic, including automatic savings account creation.</p>
            </div>
            <button onClick={downloadImportSample} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white">
              Download Sample CSV
            </button>
          </div>

          {importError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{importError}</div>}
          {importResult && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <p className="font-bold text-slate-800">Import completed: {importResult.created} created, {importResult.failed} failed.</p>
              {importResult.failed > 0 && (
                <div className="mt-2 max-h-40 overflow-auto space-y-1">
                  {importResult.results.filter((r) => !r.success).map((r) => (
                    <p key={r.row} className="text-rose-600">
                      Row {r.row}: {r.message}{formatImportDetails(r.details) ? ` (${formatImportDetails(r.details)})` : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Default Branch</label>
              <select
                value={importBranchId}
                onChange={(e) => setImportBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              >
                {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.branchName}</option>)}
              </select>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-4 mb-1">CSV / JSON File</label>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  file.text().then(loadImportText);
                }}
                className="w-full text-xs"
              />
              <button
                onClick={submitImport}
                disabled={importing || importRows.length === 0}
                className="mt-4 w-full px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${importRows.length} Members`}
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Paste CSV / JSON</label>
              <textarea
                rows={9}
                onChange={(e) => loadImportText(e.target.value)}
                placeholder="Paste CSV with headers here..."
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-2">Manual member numbers can be supplied in `memberNo`; use digits only, for example `101`, and the system stores it as `NCS-0101`.</p>
            </div>
          </div>
        </CardWrapper>
      )}

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
