'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (moduleFilter) {
        params.append('moduleName', moduleFilter);
      }

      const res = await fetch(`/api/approvals?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setApprovals(json.data);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, moduleFilter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const columns = [
    {
      header: 'Requested At',
      accessor: 'requestedAt',
      cell: ({ value }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Module Scope',
      accessor: 'moduleName',
      cell: ({ row }) => (
        <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
          {row.moduleName}
        </span>
      ),
    },
    {
      header: 'Request Type',
      accessor: 'requestType',
      cell: ({ value }) => (
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {value}
        </span>
      ),
    },
    {
      header: 'Initiated By (Maker)',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {row.requestedBy?.fullName || 'SYSTEM'}
        </span>
      ),
    },
    {
      header: 'Current Status',
      accessor: 'status',
      cell: ({ value }) => (
        <StatusBadge status={value} type="warning" />
      ),
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/approvals/${row._id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-450 dark:hover:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/45 rounded-lg transition"
        >
          <Eye className="w-3.5 h-3.5" />
          Review & Process
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorization Queue"
        subtitle="Maker-Checker controls and operational approvals queue"
      />

      {/* Filters Area */}
      <CardWrapper className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none"
            >
              <option value="">All Modules</option>
              <option value="TRANSACTION">Transactions</option>
              <option value="REVERSAL">Reversals</option>
            </select>
          </div>
        </div>
      </CardWrapper>

      {/* Approvals Table */}
      <CardWrapper className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={approvals}
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
