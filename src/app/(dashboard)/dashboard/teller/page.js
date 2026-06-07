'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Plus,
  XCircle,
  RefreshCw,
  Eye,
  ArrowRightLeft,
  Vault,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Filter,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

function DenominationInput({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="w-20 text-right font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
        ₹{label.toLocaleString('en-IN')}
      </div>
      <span className="text-slate-400 text-xs">×</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-24 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      <span className="text-slate-400 text-xs">=</span>
      <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 w-28 text-right">
        ₹{(label * value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function TellerOpsPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Open Session Modal State
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openForm, setOpenForm] = useState({
    branchId: '',
    openingBalance: 0,
    remarks: '',
    denominations: Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])),
  });

  // Close Session Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingSession, setClosingSession] = useState(null);
  const [closeForm, setCloseForm] = useState({
    physicalBalance: 0,
    remarks: '',
    denominations: Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])),
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      const res = await fetch('/api/branches?limit=100');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || []);
        if (json.data?.length === 1) {
          setOpenForm((p) => ({ ...p, branchId: json.data[0]._id }));
          setBranchFilter(json.data[0]._id);
        }
      }
    }
    loadBranches();
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/cash-sessions?page=${page}&limit=${limit}`;
      if (branchFilter) url += `&branchId=${branchFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSessions(json.data || []);
        setTotalPages(json.meta?.pages || 1);
        setTotalRecords(json.meta?.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, branchFilter, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Compute denomination total
  const computeDenomTotal = (denoms) =>
    DENOMINATIONS.reduce((sum, d) => sum + d * (denoms[d] || 0), 0);

  const handleOpenDenomChange = (denom, val) => {
    setOpenForm((prev) => {
      const newDenoms = { ...prev.denominations, [denom]: val };
      const total = computeDenomTotal(newDenoms);
      return { ...prev, denominations: newDenoms, openingBalance: total };
    });
  };

  const handleCloseDenomChange = (denom, val) => {
    setCloseForm((prev) => {
      const newDenoms = { ...prev.denominations, [denom]: val };
      const total = computeDenomTotal(newDenoms);
      return { ...prev, denominations: newDenoms, physicalBalance: total };
    });
  };

  const handleOpenSession = async () => {
    setError('');
    setSuccess('');
    if (!openForm.branchId) {
      setError('Please select a branch');
      return;
    }
    setSubmitting(true);
    try {
      const denominations = DENOMINATIONS.filter((d) => openForm.denominations[d] > 0).map((d) => ({
        denomination: d,
        count: openForm.denominations[d],
      }));

      const res = await fetch('/api/cash-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: openForm.branchId,
          openingBalance: openForm.openingBalance,
          remarks: openForm.remarks,
          denominations,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Teller session opened successfully!');
        setShowOpenModal(false);
        setOpenForm({ branchId: openForm.branchId, openingBalance: 0, remarks: '', denominations: Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])) });
        fetchSessions();
      } else {
        setError(json.error?.message || 'Failed to open session');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!closingSession) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const denominations = DENOMINATIONS.filter((d) => closeForm.denominations[d] > 0).map((d) => ({
        denomination: d,
        count: closeForm.denominations[d],
      }));

      const res = await fetch('/api/cash-sessions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: closingSession._id,
          physicalBalance: closeForm.physicalBalance,
          remarks: closeForm.remarks,
          denominations,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Session closed successfully! Day-end verified.');
        setShowCloseModal(false);
        setClosingSession(null);
        setCloseForm({ physicalBalance: 0, remarks: '', denominations: Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])) });
        fetchSessions();
      } else {
        setError(json.error?.message || 'Failed to close session');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      sessions,
      [
        { header: 'Session No', accessor: 'sessionNo' },
        { header: 'Teller', accessor: (r) => r.userId?.name || 'N/A' },
        { header: 'Branch', accessor: (r) => r.branchId?.branchName || 'N/A' },
        { header: 'Opening Balance (₹)', accessor: 'openingBalance' },
        { header: 'System Balance (₹)', accessor: 'systemBalance' },
        { header: 'Physical Balance (₹)', accessor: 'physicalBalance' },
        { header: 'Difference (₹)', accessor: 'differenceAmount' },
        { header: 'Status', accessor: 'status' },
        { header: 'Opened At', accessor: 'openedAt' },
        { header: 'Closed At', accessor: 'closedAt' },
      ],
      'Noble-Teller-Sessions.csv'
    );
  };

  const openSessions = sessions.filter((s) => s.status === 'open');
  const closedToday = sessions.filter((s) => s.status === 'closed' && new Date(s.closedAt) > new Date(Date.now() - 86400000));

  const columns = [
    {
      header: 'Session No',
      accessor: 'sessionNo',
      cell: ({ value }) => (
        <span className="font-mono text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg">
          {value}
        </span>
      ),
    },
    {
      header: 'Teller',
      accessor: 'userId',
      cell: ({ value }) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">{value?.name || 'Unknown'}</p>
          <p className="text-[10px] text-slate-450 dark:text-slate-500">{value?.email || ''}</p>
        </div>
      ),
    },
    {
      header: 'Branch',
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">{row.branchId?.branchName || 'N/A'}</span>
      ),
    },
    {
      header: 'Opening Balance',
      accessor: 'openingBalance',
      cell: ({ value }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          ₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'System Balance',
      accessor: 'systemBalance',
      cell: ({ value }) => (
        <span className="font-mono text-xs font-bold text-indigo-650 dark:text-indigo-400">
          ₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Difference',
      accessor: 'differenceAmount',
      cell: ({ value, row }) =>
        row.status === 'closed' ? (
          <span className={`font-mono text-xs font-bold ${value !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {value >= 0 ? '+' : ''}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Opened At',
      accessor: 'openedAt',
      cell: ({ value }) => (
        <span className="font-mono text-[10px] text-slate-500">
          {value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/teller/${row._id}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 transition-all text-[11px] font-bold rounded-lg cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            View
          </button>
          {row.status === 'open' && (
            <button
              onClick={() => {
                setClosingSession(row);
                setCloseForm({ physicalBalance: 0, remarks: '', denominations: Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])) });
                setShowCloseModal(true);
                setError('');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-600 hover:text-white transition-all text-[11px] font-bold rounded-lg cursor-pointer"
            >
              <XCircle className="w-3 h-3" />
              Close
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teller Operations"
        subtitle="Manage cash sessions, teller registers, cash transfers, and vault operations for Noble Cooperative Bank."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Teller Ops', href: '#' },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/dashboard/teller/transfers')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Cash Transfers
            </button>
            <button
              onClick={() => router.push('/dashboard/teller/vault')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm"
            >
              <Vault className="w-3.5 h-3.5" />
              Vault
            </button>
            <button
              onClick={() => router.push('/dashboard/teller/reports')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Reports
            </button>
            <button
              onClick={() => {
                setOpenForm({ branchId: branchFilter || '', openingBalance: 0, remarks: '', denominations: Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])) });
                setError('');
                setShowOpenModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
            >
              <Plus className="w-4 h-4" />
              Open Session
            </button>
          </div>
        }
      />

      {/* Feedback banners */}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardWrapper className="p-4 border-l-4 border-indigo-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider">Active Sessions</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{openSessions.length}</p>
            </div>
          </div>
        </CardWrapper>
        <CardWrapper className="p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-650 dark:text-emerald-400">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider">Closed Today</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">{closedToday.length}</p>
            </div>
          </div>
        </CardWrapper>
        <CardWrapper className="p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-650 dark:text-amber-400">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-bold uppercase tracking-wider">Total Active Cash</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                ₹{openSessions.reduce((s, ss) => s + (ss.systemBalance || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </CardWrapper>
      </div>

      {/* Sessions table */}
      <CardWrapper className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cash Session Register</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>
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
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={fetchSessions} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleExport} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <DataTable columns={columns} data={sessions} loading={loading} />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-450 dark:text-slate-500">
            Showing {sessions.length} of {totalRecords} sessions
          </p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </CardWrapper>

      {/* Open Session Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-650 flex items-center justify-center text-white">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Open Teller Session</h2>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500">Record physical cash and open your day session</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Branch *</label>
                  <select
                    value={openForm.branchId}
                    onChange={(e) => setOpenForm((p) => ({ ...p, branchId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>{b.branchName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Opening Denomination Breakdown</label>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    {DENOMINATIONS.map((d) => (
                      <DenominationInput
                        key={d}
                        label={d}
                        value={openForm.denominations[d] || 0}
                        onChange={(val) => handleOpenDenomChange(d, val)}
                      />
                    ))}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Opening Balance</span>
                      <span className="font-mono font-bold text-base text-indigo-650 dark:text-indigo-400">
                        ₹{openForm.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Remarks (optional)</label>
                  <textarea
                    value={openForm.remarks}
                    onChange={(e) => setOpenForm((p) => ({ ...p, remarks: e.target.value }))}
                    rows={2}
                    placeholder="Opening session remarks..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowOpenModal(false); setError(''); }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenSession}
                  disabled={submitting || !openForm.branchId}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Opening...' : 'Open Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseModal && closingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Close Session</h2>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500 font-mono">{closingSession.sessionNo}</p>
                </div>
              </div>

              {/* Session summary */}
              <div className="mb-5 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Opening Balance</span>
                  <span className="font-mono font-bold">₹{closingSession.openingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">System Balance (Calculated)</span>
                  <span className="font-mono font-bold text-indigo-650 dark:text-indigo-400">₹{closingSession.systemBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Physical Cash Count (Denomination)</label>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    {DENOMINATIONS.map((d) => (
                      <DenominationInput
                        key={d}
                        label={d}
                        value={closeForm.denominations[d] || 0}
                        onChange={(val) => handleCloseDenomChange(d, val)}
                      />
                    ))}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Physical Cash</span>
                      <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                        ₹{closeForm.physicalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Difference preview */}
                    {closeForm.physicalBalance > 0 && (
                      <div className={`flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700`}>
                        <span className="text-[10px] font-bold uppercase text-slate-500">Difference</span>
                        <span className={`font-mono font-bold text-sm ${(closeForm.physicalBalance - closingSession.systemBalance) !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {(closeForm.physicalBalance - closingSession.systemBalance) >= 0 ? '+' : ''}
                          ₹{(closeForm.physicalBalance - closingSession.systemBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Closing Remarks</label>
                  <textarea
                    value={closeForm.remarks}
                    onChange={(e) => setCloseForm((p) => ({ ...p, remarks: e.target.value }))}
                    rows={2}
                    placeholder="Day-end closure remarks..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowCloseModal(false); setError(''); }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseSession}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Closing...' : 'Close & Reconcile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
