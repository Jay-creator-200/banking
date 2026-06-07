'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Search,
  Eye,
  Calendar,
  Layers,
  Activity,
  Terminal,
  HelpCircle,
  FileText
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal/Drawer States
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Load User details mapping
  const loadUsersMap = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=1000');
      if (res.ok) {
        const json = await res.json();
        const map = {};
        if (Array.isArray(json.data)) {
          json.data.forEach((u) => {
            map[u._id] = `${u.fullName} (${u.username})`;
          });
        }
        setUsersMap(map);
      }
    } catch (e) {
      console.error('Failed to load users mapping:', e);
    }
  }, []);

  // Fetch Audit Logs List
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/audit-logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      if (moduleFilter) url += `&moduleName=${encodeURIComponent(moduleFilter)}`;
      if (actionFilter) url += `&actionName=${encodeURIComponent(actionFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, moduleFilter, actionFilter]);

  useEffect(() => {
    loadUsersMap();
  }, [loadUsersMap]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleModuleChange = (e) => {
    setModuleFilter(e.target.value);
    setPage(1);
  };

  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handleOpenDetail = (log) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  // Export to CSV helper
  const handleExport = () => {
    const cols = [
      { header: 'Timestamp', cellValue: (row) => new Date(row.createdAt).toLocaleString() },
      { header: 'Operator', cellValue: (row) => usersMap[row.userId] || row.userId || 'SYSTEM' },
      { header: 'Module', accessor: 'moduleName' },
      { header: 'Action', accessor: 'actionName' },
      { header: 'Ref Collection', accessor: 'referenceCollection' },
      { header: 'Ref ID', accessor: 'referenceId' },
      { header: 'IP Address', accessor: 'ipAddress' },
      { header: 'User Agent', accessor: 'userAgent' },
    ];
    exportToCSV(logs, cols, 'Noble-AuditLogs-Export.csv');
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'createdAt',
      cell: ({ value }) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Operator',
      accessor: 'userId',
      cell: ({ value }) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {usersMap[value] || value || 'SYSTEM'}
        </span>
      ),
    },
    {
      header: 'Scope/Module',
      accessor: 'moduleName',
      cell: ({ value }) => (
        <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded uppercase tracking-wider">
          {value}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'actionName',
      cell: ({ value }) => (
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {value}
        </span>
      ),
    },
    {
      header: 'IP Address',
      accessor: 'ipAddress',
      cell: ({ value }) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{value || 'N/A'}</span>
      ),
    },
    {
      header: 'Inspect',
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenDetail(row)}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Inspect Payload"
        >
          <Eye className="w-4 h-4" />
          <span>Inspect</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Track administrator changes, record modifications, and operator details."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Audit Logs', href: '#' },
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
              value={moduleFilter}
              onChange={handleModuleChange}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none font-bold"
            >
              <option value="">All Modules</option>
              <option value="users">Users</option>
              <option value="roles">Roles</option>
              <option value="branches">Branches</option>
              <option value="auth">Auth</option>
            </select>

            <select
              value={actionFilter}
              onChange={handleActionChange}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none font-bold"
            >
              <option value="">All Actions</option>
              <option value="CREATE_USER">CREATE_USER</option>
              <option value="UPDATE_USER">UPDATE_USER</option>
              <option value="DELETE_USER">DELETE_USER</option>
              <option value="CREATE_ROLE">CREATE_ROLE</option>
              <option value="UPDATE_ROLE">UPDATE_ROLE</option>
              <option value="DELETE_ROLE">DELETE_ROLE</option>
              <option value="CREATE_BRANCH">CREATE_BRANCH</option>
              <option value="UPDATE_BRANCH">UPDATE_BRANCH</option>
              <option value="DELETE_BRANCH">DELETE_BRANCH</option>
            </select>
          </div>

          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search operator ID, scope..."
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
        title="Audit Trail Inspector"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Operator</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {usersMap[selectedLog.userId] || selectedLog.userId || 'SYSTEM'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Timestamp</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="mt-2">
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Module</p>
                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {selectedLog.moduleName}
                </p>
              </div>
              <div className="mt-2">
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Action</p>
                <p className="font-mono font-bold text-indigo-650 dark:text-indigo-400 uppercase">
                  {selectedLog.actionName}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">IP Address</p>
                <p className="font-mono text-slate-800 dark:text-slate-200">{selectedLog.ipAddress || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1 font-sans">User Agent</p>
                <p className="font-mono text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 break-all">
                  {selectedLog.userAgent || 'Unknown'}
                </p>
              </div>
              {selectedLog.referenceId && (
                <div className="pt-2">
                  <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Reference ID</p>
                  <p className="font-mono text-slate-850 dark:text-slate-300">
                    {selectedLog.referenceCollection}: {selectedLog.referenceId}
                  </p>
                </div>
              )}
            </div>

            {/* Side-by-Side Payload Comparison */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Data Delta Inspector</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Before Mutation</p>
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto">
                    {selectedLog.oldValues ? (
                      <pre className="text-slate-700 dark:text-slate-350">
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-slate-400 italic">No historical state (Create operation)</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">After Mutation</p>
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto">
                    {selectedLog.newValues ? (
                      <pre className="text-indigo-650 dark:text-indigo-300">
                        {JSON.stringify(selectedLog.newValues, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-slate-400 italic">No final state (Delete operation)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => setDetailOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
