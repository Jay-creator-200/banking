'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Download,
  Filter,
  Eye,
  CheckCircle,
  AlertTriangle,
  Receipt
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function JournalVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [flatHeads, setFlatHeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter States
  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drawer Form States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    branchId: '',
    voucherType: 'JOURNAL',
    narration: '',
    voucherDate: '',
    entries: [
      { accountHeadId: '', debit: 0, credit: 0, narration: '' },
      { accountHeadId: '', debit: 0, credit: 0, narration: '' },
    ],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formGlobalError, setFormGlobalError] = useState(null);

  // Load supporting options (Branches, Account Heads)
  const loadOptions = useCallback(async () => {
    try {
      const [bRes, ahRes] = await Promise.all([
        fetch('/api/branches?limit=100'),
        fetch('/api/account-heads'),
      ]);
      
      let defaultBranchId = '';
      if (bRes.ok) {
        const json = await bRes.json();
        setBranches(json.data);
        if (json.data.length > 0) defaultBranchId = json.data[0]._id;
      }

      if (ahRes.ok) {
        const json = await ahRes.json();
        // Traverse tree to get flat list
        const list = [];
        const traverse = (nodes) => {
          nodes.forEach((n) => {
            list.push({ _id: n._id, name: n.name, code: n.code });
            if (n.children && n.children.length > 0) traverse(n.children);
          });
        };
        traverse(json.data);
        setFlatHeads(list);
      }

      setFormData((prev) => ({
        ...prev,
        branchId: defaultBranchId,
      }));
    } catch (err) {
      console.error('Failed to load voucher form options:', err);
    }
  }, []);

  // Fetch Voucher Register
  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortField,
        sortOrder,
        search,
      });

      if (branchFilter) params.append('branchId', branchFilter);
      if (typeFilter) params.append('voucherType', typeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/journal-vouchers?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setVouchers(json.data);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load vouchers list:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortField, sortOrder, search, branchFilter, typeFilter, startDate, endDate]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Totals calculations for the form
  const totalDebit = formData.entries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
  const totalCredit = formData.entries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  // Add line to form entries
  const addEntryLine = () => {
    setFormData((prev) => ({
      ...prev,
      entries: [...prev.entries, { accountHeadId: '', debit: 0, credit: 0, narration: '' }],
    }));
  };

  // Remove line from form entries
  const removeEntryLine = (index) => {
    if (formData.entries.length <= 2) return;
    const entries = [...formData.entries];
    entries.splice(index, 1);
    setFormData((prev) => ({ ...prev, entries }));
  };

  // Handle entry line change
  const handleEntryChange = (index, field, val) => {
    const entries = [...formData.entries];
    entries[index][field] = val;
    setFormData((prev) => ({ ...prev, entries }));
  };

  // Submit Voucher Form
  const handleSubmit = async () => {
    if (!isBalanced) {
      setFormGlobalError('Double-entry mismatch: Total debits must equal total credits, and must be positive.');
      return;
    }

    setFormLoading(true);
    setFormGlobalError(null);
    try {
      const payload = {
        ...formData,
        entries: formData.entries.map((entry) => ({
          accountHeadId: entry.accountHeadId,
          debit: parseFloat(entry.debit) || 0,
          credit: parseFloat(entry.credit) || 0,
          narration: entry.narration || undefined,
        })),
        voucherDate: formData.voucherDate ? new Date(formData.voucherDate) : undefined,
      };

      const res = await fetch('/api/journal-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormGlobalError(json.message || 'Failed to create journal voucher.');
      } else {
        setDrawerOpen(false);
        setFormData({
          branchId: branches[0]?._id || '',
          voucherType: 'JOURNAL',
          narration: '',
          voucherDate: '',
          entries: [
            { accountHeadId: '', debit: 0, credit: 0, narration: '' },
            { accountHeadId: '', debit: 0, credit: 0, narration: '' },
          ],
        });
        fetchVouchers();
      }
    } catch (err) {
      setFormGlobalError('Network communication error.');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Voucher ID / Date',
      accessor: 'voucherNo',
      cell: ({ row }) => (
        <div>
          <Link
            href={`/dashboard/journal-vouchers/${row._id}`}
            className="font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {row.voucherNo}
          </Link>
          <span className="block text-[10px] text-slate-400 mt-0.5 font-semibold">
            {new Date(row.voucherDate).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Branch',
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
          {row.branchId?.branchName || 'Head Office'}
        </span>
      ),
    },
    {
      header: 'Voucher Type',
      accessor: 'voucherType',
      cell: ({ value }) => (
        <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {value}
        </span>
      ),
    },
    {
      header: 'Narration',
      accessor: 'narration',
      cell: ({ value }) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 max-w-[320px] truncate block">
          {value || 'No narration.'}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/journal-vouchers/${row._id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <Eye className="w-3.5 h-3.5" />
          View Entries
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Voucher Register"
        subtitle="Manage double-entry transactions, cash flows, adjustments, and ledgers"
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          Create Voucher
        </button>
      </PageHeader>

      {/* Filters */}
      <CardWrapper className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full">
            <SearchInput
              placeholder="Search by Voucher No, Narration..."
              onSearch={(val) => { setSearch(val); setPage(1); }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="RECEIPT">Receipt</option>
              <option value="PAYMENT">Payment</option>
              <option value="JOURNAL">Journal</option>
              <option value="CONTRA">Contra</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
        </div>
      </CardWrapper>

      {/* Register List */}
      <CardWrapper className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={vouchers}
            />
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/60">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </CardWrapper>

      {/* Creation Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Record Journal Voucher (Double-Entry)"
        width="650px"
      >
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel="Post Journal entries"
          loading={formLoading}
          error={formGlobalError}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Operating Branch
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  required
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.branchName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Voucher Type
                </label>
                <select
                  value={formData.voucherType}
                  onChange={(e) => setFormData({ ...formData, voucherType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                >
                  <option value="JOURNAL">JOURNAL</option>
                  <option value="RECEIPT">RECEIPT</option>
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="CONTRA">CONTRA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Voucher Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.voucherDate}
                  onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Voucher Narration
                </label>
                <input
                  type="text"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  placeholder="General voucher posting notes..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Entries Table */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Transaction Ledger Lines
                </span>
                <button
                  type="button"
                  onClick={addEntryLine}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-dashed border-indigo-300 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add Row
                </button>
              </div>

              <div className="space-y-3">
                {formData.entries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start bg-slate-50/50 dark:bg-slate-900/10 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <div className="flex-1 space-y-2">
                      <select
                        value={entry.accountHeadId}
                        onChange={(e) => handleEntryChange(idx, 'accountHeadId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                        required
                      >
                        <option value="">Select Account Head...</option>
                        {flatHeads.map((h) => (
                          <option key={h._id} value={h._id}>[{h.code}] {h.name}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={entry.narration}
                        onChange={(e) => handleEntryChange(idx, 'narration', e.target.value)}
                        placeholder="Line description (optional)"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Debit"
                        value={entry.debit || ''}
                        onChange={(e) => handleEntryChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-right focus:outline-none"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Credit"
                        value={entry.credit || ''}
                        onChange={(e) => handleEntryChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-right focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeEntryLine(idx)}
                      disabled={formData.entries.length <= 2}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-slate-400 mt-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Running summary block */}
              <div className="mt-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-400">Total Debit:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">₹{totalDebit.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-400">Total Credit:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">₹{totalCredit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-right">
                  {isBalanced ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-extrabold">
                      <CheckCircle className="w-4 h-4" /> Ledger is Balanced
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-rose-500 font-extrabold animate-pulse">
                      <AlertTriangle className="w-4 h-4" /> Out of Balance (₹{Math.abs(totalDebit - totalCredit).toLocaleString()})
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </FormWrapper>
      </Drawer>
    </div>
  );
}
