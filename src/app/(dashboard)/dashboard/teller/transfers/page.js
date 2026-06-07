'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRightLeft,
  Plus,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';

export default function CashTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    branchId: '',
    fromSessionId: '',
    toSessionId: '',
    transferType: 'teller_to_vault',
    amount: '',
    remarks: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function init() {
      const [brRes, sesRes] = await Promise.all([
        fetch('/api/branches?limit=100'),
        fetch('/api/cash-sessions?status=open&limit=100'),
      ]);
      if (brRes.ok) {
        const j = await brRes.json();
        setBranches(j.data || []);
      }
      if (sesRes.ok) {
        const j = await sesRes.json();
        setSessions(j.data || []);
      }
    }
    init();
  }, []);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/cash-transfers?page=${page}&limit=${limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTransfers(json.data || []);
        setTotalPages(json.meta?.pages || 1);
        setTotalRecords(json.meta?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleSubmit = async () => {
    setError('');
    if (!form.branchId || !form.fromSessionId || !form.amount) {
      setError('Branch, source session, and amount are required');
      return;
    }
    if (form.transferType === 'teller_to_teller' && !form.toSessionId) {
      setError('Destination session is required for teller-to-teller transfer');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/cash-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: form.branchId,
          fromSessionId: form.fromSessionId,
          toSessionId: form.toSessionId || undefined,
          transferType: form.transferType,
          amount: parseFloat(form.amount),
          remarks: form.remarks,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Transfer request submitted successfully!');
        setShowModal(false);
        fetchTransfers();
      } else {
        setError(json.error?.message || 'Failed to submit transfer');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcess = async (transferId, action) => {
    try {
      const res = await fetch('/api/cash-transfers/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferId, action }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess(`Transfer ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        fetchTransfers();
      } else {
        setSuccess('');
        setError(json.error?.message || 'Failed to process transfer');
      }
    } catch (e) {
      setError('Network error.');
    }
  };

  const columns = [
    {
      header: 'Transfer No',
      accessor: 'transferNo',
      cell: ({ value }) => (
        <span className="font-mono text-[11px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg">{value}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'transferType',
      cell: ({ value }) => (
        <span className="text-xs font-semibold capitalize">{value?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      header: 'From Session',
      accessor: 'fromSessionId',
      cell: ({ value }) => (
        <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">{value?.sessionNo || 'N/A'}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: ({ value }) => (
        <span className="font-mono font-bold text-xs text-indigo-650 dark:text-indigo-400">
          ₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      cell: ({ value }) => (
        <span className="font-mono text-[10px] text-slate-500">
          {value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) =>
        row.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleProcess(row._id, 'approve')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-600 hover:text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-3 h-3" />
              Approve
            </button>
            <button
              onClick={() => handleProcess(row._id, 'reject')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-600 hover:text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all"
            >
              <XCircle className="w-3 h-3" />
              Reject
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 italic capitalize">{row.status}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/teller')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-650"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Cash Transfers"
          subtitle="Manage inter-teller and teller-vault cash movements"
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Teller Ops', href: '/dashboard/teller' },
            { label: 'Transfers', href: '#' },
          ]}
          action={
            <button
              onClick={() => { setForm({ branchId: '', fromSessionId: '', toSessionId: '', transferType: 'teller_to_vault', amount: '', remarks: '' }); setError(''); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Transfer
            </button>
          }
        />
      </div>

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <CardWrapper className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Transfer Register</h3>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={fetchTransfers} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <DataTable columns={columns} data={transfers} loading={loading} />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-450 dark:text-slate-500">Showing {transfers.length} of {totalRecords} transfers</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </CardWrapper>

      {/* New Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-650 flex items-center justify-center text-white">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">New Cash Transfer</h2>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500">Initiate teller or vault cash movement</p>
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
                  <select value={form.branchId} onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">Select branch...</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Transfer Type *</label>
                  <select value={form.transferType} onChange={(e) => setForm((p) => ({ ...p, transferType: e.target.value, toSessionId: '' }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="teller_to_vault">Teller → Vault</option>
                    <option value="vault_to_teller">Vault → Teller</option>
                    <option value="teller_to_teller">Teller → Teller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">From Session *</label>
                  <select value={form.fromSessionId} onChange={(e) => setForm((p) => ({ ...p, fromSessionId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">Select open session...</option>
                    {sessions.map((s) => (
                      <option key={s._id} value={s._id}>{s.sessionNo} — {s.userId?.name || 'Unknown Teller'} (₹{s.systemBalance?.toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                {form.transferType === 'teller_to_teller' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">To Session *</label>
                    <select value={form.toSessionId} onChange={(e) => setForm((p) => ({ ...p, toSessionId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="">Select destination session...</option>
                      {sessions.filter((s) => s._id !== form.fromSessionId).map((s) => (
                        <option key={s._id} value={s._id}>{s.sessionNo} — {s.userId?.name || 'Unknown'}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="Enter transfer amount"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Remarks</label>
                  <textarea
                    value={form.remarks}
                    onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                    rows={2}
                    placeholder="Transfer remarks..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowModal(false); setError(''); }} className="flex-1 px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all">
                  {submitting ? 'Submitting...' : 'Submit Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
