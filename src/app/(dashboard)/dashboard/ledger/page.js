'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Download,
  Filter,
  Eye,
  BookOpen
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function LedgerPage() {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [flatHeads, setFlatHeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter states
  const [accountHeadFilter, setAccountHeadFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load dropdown lists (Branches & Account Heads)
  const loadOptions = useCallback(async () => {
    try {
      const [bRes, ahRes] = await Promise.all([
        fetch('/api/branches?limit=100'),
        fetch('/api/account-heads'),
      ]);

      if (bRes.ok) {
        const json = await bRes.json();
        setBranches(json.data);
      }

      if (ahRes.ok) {
        const json = await ahRes.json();
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
    } catch (err) {
      console.error('Failed to load ledger filter options:', err);
    }
  }, []);

  // Fetch Ledger entries list
  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortField,
        sortOrder,
      });

      if (accountHeadFilter) params.append('accountHeadId', accountHeadFilter);
      if (branchFilter) params.append('branchId', branchFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/ledger-entries?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLedgerEntries(json.data);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load general ledger entries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortField, sortOrder, accountHeadFilter, branchFilter, startDate, endDate]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleSort = (field, order) => {
    setSortField(field);
    setSortOrder(order);
  };

  const handleExport = () => {
    const cols = [
      { header: 'Posting Date', cellValue: (row) => new Date(row.entryDate).toLocaleString() },
      { header: 'Voucher No', cellValue: (row) => row.voucherId?.voucherNo || 'N/A' },
      { header: 'Branch', cellValue: (row) => row.branchId?.branchName || 'N/A' },
      { header: 'Account Head Name', cellValue: (row) => row.accountHeadId?.name || 'N/A' },
      { header: 'Account Head Code', cellValue: (row) => row.accountHeadId?.code || 'N/A' },
      { header: 'Narration', accessor: 'narration' },
      { header: 'Debit', accessor: 'debit' },
      { header: 'Credit', accessor: 'credit' },
    ];
    exportToCSV(ledgerEntries, cols, 'Noble-GeneralLedger-Export.csv');
  };

  const columns = [
    {
      header: 'Posting Date',
      accessor: 'entryDate',
      cell: ({ value }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Voucher No',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/journal-vouchers/${row.voucherId?._id}`}
          className="font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {row.voucherId?.voucherNo || 'System Posting'}
        </Link>
      ),
    },
    {
      header: 'Account Head',
      cell: ({ row }) => (
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {row.accountHeadId?.name || 'Unknown Account'}
          </span>
          <span className="block text-[9px] font-extrabold text-slate-400 mt-0.5">
            {row.accountHeadId?.code}
          </span>
        </div>
      ),
    },
    {
      header: 'Narration',
      accessor: 'narration',
      cell: ({ value }) => (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[280px] truncate block">
          {value}
        </span>
      ),
    },
    {
      header: 'Debit (₹)',
      accessor: 'debit',
      cell: ({ value }) => (
        <span className="text-xs font-extrabold text-emerald-600">
          {value > 0 ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
        </span>
      ),
    },
    {
      header: 'Credit (₹)',
      accessor: 'credit',
      cell: ({ value }) => (
        <span className="text-xs font-extrabold text-rose-500">
          {value > 0 ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger Ledger"
        subtitle="Comprehensive view of all operational double-entry transactions"
      >
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Ledger
        </button>
      </PageHeader>

      {/* Filters */}
      <CardWrapper className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <BookOpen className="w-4 h-4 text-slate-400" />
          
          <select
            value={accountHeadFilter}
            onChange={(e) => { setAccountHeadFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none min-w-[180px]"
          >
            <option value="">All Account Heads</option>
            {flatHeads.map((h) => (
              <option key={h._id} value={h._id}>[{h.code}] {h.name}</option>
            ))}
          </select>

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

          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 dark:text-slate-300 focus:outline-none"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-705 dark:text-slate-300 focus:outline-none"
          />
        </div>
      </CardWrapper>

      {/* Ledger Table */}
      <CardWrapper className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={ledgerEntries}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortChange={handleSort}
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
    </div>
  );
}
