'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Eye,
  Filter,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

export default function ReversalsPage() {
  const [reversals, setReversals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReversals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const res = await fetch(`/api/transactions/reversal?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReversals(json.data);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load reversals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchReversals();
  }, [fetchReversals]);

  const columns = [
    {
      header: 'Requested Date',
      accessor: 'requestedAt',
      cell: ({ value }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Original Transaction',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/transactions/${row.transactionId?._id}`}
          className="font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {row.transactionId?.transactionNo || 'Open Details'}
        </Link>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      cell: ({ value }) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-[220px] truncate block">
          {value}
        </span>
      ),
    },
    {
      header: 'Requested By',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-450">
          {row.requestedBy?.fullName || 'SYSTEM'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ value }) => {
        let style = 'warning';
        if (value === 'APPROVED') style = 'success';
        if (value === 'REJECTED') style = 'danger';
        return <StatusBadge status={value} type={style} />;
      },
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/transactions/${row.transactionId?._id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <Eye className="w-3.5 h-3.5" />
          View Original
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Reversals"
        subtitle="Track ledger compensating entries, corrections, and journal rollbacks"
      />

      {/* Filters Area */}
      <CardWrapper className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved (Compensated)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </CardWrapper>

      {/* Reversals Table */}
      <CardWrapper className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={reversals}
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
