'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Vault,
  Plus,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';

export default function VaultPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(null);

  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    branchId: '',
    transactionType: 'VAULT_IN',
    amount: '',
    narration: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadBranches() {
      const res = await fetch('/api/branches?limit=100');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || []);
        if (json.data?.length === 1) {
          setBranchFilter(json.data[0]._id);
        }
      }
    }
    loadBranches();
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/vault-transactions?page=${page}&limit=${limit}`;
      if (branchFilter) url += `&branchId=${branchFilter}`;
      if (typeFilter) url += `&transactionType=${typeFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setTotalPages(json.meta?.pages || 1);
        setTotalRecords(json.meta?.total || 0);
        if (json.meta?.currentBalance !== null && json.meta?.currentBalance !== undefined) {
          setCurrentBalance(json.meta.currentBalance);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, branchFilter, typeFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSubmit = async () => {
    setError('');
    if (!form.branchId || !form.amount) {
      setError('Branch and amount are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/vault-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: form.branchId,
          transactionType: form.transactionType,
          amount: parseFloat(form.amount),
          narration: form.narration,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess(`Vault ${form.transactionType === 'VAULT_IN' ? 'deposit' : 'withdrawal'} posted successfully!`);
        setShowModal(false);
        setForm({ branchId: form.branchId, transactionType: 'VAULT_IN', amount: '', narration: '' });
        fetchTransactions();
      } else {
        setError(json.error?.message || 'Failed to post vault transaction');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Vault Txn No',
      accessor: 'vaultTxnNo',
      cell: ({ value }) => (
        <span className="font-mono text-[11px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-lg">{value}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'transactionType',
      cell: ({ value }) => (
        <div className="flex items-center gap-1.5">
          {value === 'VAULT_IN' ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span className={`text-xs font-bold ${value === 'VAULT_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {value === 'VAULT_IN' ? 'Cash In' : 'Cash Out'}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: ({ value, row }) => (
        <span className={`font-mono font-bold text-xs ${row.transactionType === 'VAULT_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {row.transactionType === 'VAULT_IN' ? '+' : '-'}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Balance Before',
      accessor: 'vaultBalanceBefore',
      cell: ({ value }) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          ₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Balance After',
      accessor: 'vaultBalanceAfter',
      cell: ({ value }) => (
        <span className="font-mono font-bold text-xs text-indigo-650 dark:text-indigo-400">
          ₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Narration',
      accessor: 'narration',
      cell: ({ value }) => <span className="text-[11px] text-slate-600 dark:text-slate-400">{value || '—'}</span>,
    },
    {
      header: 'Date',
      accessor: 'transactionDate',
      cell: ({ value }) => (
        <span className="font-mono text-[10px] text-slate-500">
          {value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </span>
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
          title="Vault Operations"
          subtitle="Track branch vault balance and cash-in/cash-out movements"
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Teller Ops', href: '/dashboard/teller' },
            { label: 'Vault', href: '#' },
          ]}
          action={
            <button
              onClick={() => { setForm({ branchId: branchFilter || '', transactionType: 'VAULT_IN', amount: '', narration: '' }); setError(''); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-violet-650 hover:bg-violet-700 text-white rounded-xl cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Post Vault Entry
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

      {/* Vault balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardWrapper className="p-5 border-l-4 border-violet-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-650 dark:text-violet-400">
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Vault Balance</p>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {currentBalance !== null ? `₹${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </p>
            </div>
          </div>
        </CardWrapper>
        <CardWrapper className="p-5 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-650 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Vault In</p>
              <p className="text-xl font-bold font-mono text-emerald-600">
                ₹{transactions.filter((t) => t.transactionType === 'VAULT_IN').reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardWrapper>
        <CardWrapper className="p-5 border-l-4 border-rose-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-650 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Vault Out</p>
              <p className="text-xl font-bold font-mono text-rose-600">
                ₹{transactions.filter((t) => t.transactionType === 'VAULT_OUT').reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardWrapper>
      </div>

      {/* Transactions table */}
      <CardWrapper className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Vault Transaction Ledger</h3>
          <div className="flex items-center gap-3">
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="">All Types</option>
              <option value="VAULT_IN">Cash In</option>
              <option value="VAULT_OUT">Cash Out</option>
            </select>
            <button onClick={fetchTransactions} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <DataTable columns={columns} data={transactions} loading={loading} />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-450 dark:text-slate-500">Showing {transactions.length} of {totalRecords} entries</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </CardWrapper>

      {/* Post Vault Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-650 flex items-center justify-center text-white">
                  <Vault className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Post Vault Transaction</h2>
                  <p className="text-[11px] text-slate-450 dark:text-slate-500">Record manual vault cash movement</p>
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20">
                    <option value="">Select branch...</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.branchName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Transaction Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ value: 'VAULT_IN', label: 'Cash In (Deposit)', icon: TrendingUp, color: 'emerald' },
                      { value: 'VAULT_OUT', label: 'Cash Out (Withdrawal)', icon: TrendingDown, color: 'rose' }].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setForm((p) => ({ ...p, transactionType: opt.value }))}
                        className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          form.transactionType === opt.value
                            ? opt.color === 'emerald'
                              ? 'bg-emerald-650 text-white border-emerald-650'
                              : 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Narration</label>
                  <textarea
                    value={form.narration}
                    onChange={(e) => setForm((p) => ({ ...p, narration: e.target.value }))}
                    rows={2}
                    placeholder="Reason for vault movement..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowModal(false); setError(''); }} className="flex-1 px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 text-xs font-bold bg-violet-650 hover:bg-violet-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-all">
                  {submitting ? 'Posting...' : 'Post Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
