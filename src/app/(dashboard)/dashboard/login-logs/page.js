'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Search,
  Eye,
  Calendar,
  ShieldAlert,
  Monitor,
  CheckCircle,
  AlertTriangle,
  LogOut
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function LoginLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Drawer States
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch Login Logs List
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/login-logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch login logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleOpenDetail = (log) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  // Export to CSV helper
  const handleExport = () => {
    const cols = [
      { header: 'Logged In At', cellValue: (row) => new Date(row.loggedInAt).toLocaleString() },
      { header: 'Email Attempt', accessor: 'email' },
      { header: 'Associated Employee', cellValue: (row) => row.userId?.fullName || 'N/A' },
      { header: 'IP Address', accessor: 'ipAddress' },
      { header: 'User Agent', accessor: 'userAgent' },
      { header: 'Status', accessor: 'loginStatus' },
    ];
    exportToCSV(logs, cols, 'Apex-LoginLogs-Export.csv');
  };

  const columns = [
    {
      header: 'Attempt Time',
      accessor: 'loggedInAt',
      cell: ({ value }) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Target Email / User',
      accessor: 'email',
      cell: ({ value, row }) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            {row.userId ? `${row.userId.fullName} (${row.userId.username})` : 'Unrecognized Credentials'}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'loginStatus',
      cell: ({ value }) => {
        const badgeColors = {
          SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
          FAILED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
          LOGOUT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
        };

        const currentStyle = badgeColors[value] || 'bg-slate-100 text-slate-650';

        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold tracking-wide rounded-full border select-none transition-all duration-300 ${currentStyle}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-85 shrink-0" />
            <span className="capitalize">{value.toLowerCase()}</span>
          </span>
        );
      },
    },
    {
      header: 'IP Address',
      accessor: 'ipAddress',
      cell: ({ value }) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{value || 'N/A'}</span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenDetail(row)}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          title="Inspect Details"
        >
          <Eye className="w-4 h-4" />
          <span>Details</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login Auditing Logs"
        subtitle="Review security access logs, trace credential failures, logins, and session terminations."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Login Logs', href: '#' },
        ]}
        action={
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        }
      />

      {/* Filters & Table */}
      <div className="border border-slate-200/90 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none font-bold"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success Logins</option>
              <option value="FAILED">Failed Attempts</option>
              <option value="LOGOUT">Session Logouts</option>
            </select>
          </div>

          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search email, IP address..."
          />
        </div>

        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          selectable={false}
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Details Inspector Drawer */}
      <Drawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Login Activity Details"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
              <div className="p-3 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200/40 dark:border-slate-800/60 text-slate-650">
                {selectedLog.loginStatus === 'SUCCESS' && <CheckCircle className="w-6 h-6 text-emerald-555" />}
                {selectedLog.loginStatus === 'FAILED' && <AlertTriangle className="w-6 h-6 text-rose-555" />}
                {selectedLog.loginStatus === 'LOGOUT' && <LogOut className="w-6 h-6 text-amber-555" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Verdict</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedLog.loginStatus}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Target Account</p>
                <p className="font-bold text-slate-850 dark:text-slate-200">{selectedLog.email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Attempt Time</p>
                <p className="font-medium text-slate-850 dark:text-slate-200">
                  {new Date(selectedLog.loggedInAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Associated Employee</p>
                <p className="font-bold text-slate-800 dark:text-slate-250">
                  {selectedLog.userId ? (
                    <span>
                      {selectedLog.userId.fullName} ({selectedLog.userId.username}) - {selectedLog.userId.employeeCode}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">No associated user found</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Terminal IP Address</p>
                <p className="font-mono text-slate-800 dark:text-slate-200">{selectedLog.ipAddress || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1 font-sans">User Agent Client Details</p>
                <p className="font-mono text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 break-all">
                  {selectedLog.userAgent || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => setDetailOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
