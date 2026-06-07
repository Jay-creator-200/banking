'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  User,
  Building2,
  CalendarDays,
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';

export default function TellerSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cash-sessions/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetail(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-650 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <p className="font-bold text-slate-700 dark:text-slate-300">Session not found</p>
        <button onClick={() => router.push('/dashboard/teller')} className="px-4 py-2 bg-indigo-650 text-white rounded-xl text-xs font-bold cursor-pointer">
          Back to Teller Ops
        </button>
      </div>
    );
  }

  const { session, openingDenominations, closingDenominations, registerEntries } = detail;

  const registerColumns = [
    {
      header: 'Reference No',
      accessor: 'referenceNo',
      cell: ({ value }) => (
        <span className="font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">{value}</span>
      ),
    },
    {
      header: 'Type',
      accessor: 'transactionType',
      cell: ({ value }) => (
        <div className="flex items-center gap-1.5">
          {(value === 'deposit' || value === 'receipt') ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span className="capitalize text-xs font-semibold">{value}</span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: ({ value, row }) => (
        <span className={`font-mono font-bold text-xs ${(row.transactionType === 'deposit' || row.transactionType === 'receipt') ? 'text-emerald-600' : 'text-rose-600'}`}>
          {(row.transactionType === 'deposit' || row.transactionType === 'receipt') ? '+' : '-'}₹{value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Time',
      accessor: 'createdAt',
      cell: ({ value }) => (
        <span className="font-mono text-[10px] text-slate-500">
          {value ? new Date(value).toLocaleString('en-IN', { timeStyle: 'short' }) : '—'}
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
          title={`Session: ${session.sessionNo}`}
          subtitle="Cash session register — transactions and denomination breakdown"
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Teller Ops', href: '/dashboard/teller' },
            { label: session.sessionNo, href: '#' },
          ]}
        />
      </div>

      {/* Session summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <CardWrapper className="p-4 border-l-4 border-indigo-500">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Opening Balance</p>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            ₹{session.openingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </CardWrapper>
        <CardWrapper className="p-4 border-l-4 border-blue-500">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">System Balance</p>
          <p className="text-xl font-bold font-mono text-indigo-650 dark:text-indigo-400">
            ₹{session.systemBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </CardWrapper>
        <CardWrapper className="p-4 border-l-4 border-emerald-500">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Physical Balance</p>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{session.physicalBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </CardWrapper>
        <CardWrapper className={`p-4 border-l-4 ${session.differenceAmount !== 0 ? 'border-rose-500' : 'border-slate-300'}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Difference</p>
          <p className={`text-xl font-bold font-mono ${session.differenceAmount !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {session.differenceAmount >= 0 ? '+' : ''}₹{session.differenceAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </CardWrapper>
      </div>

      {/* Session info + denominations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardWrapper className="p-5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-4">Session Details</h3>
          <dl className="space-y-3 text-xs">
            {[
              { label: 'Teller', value: session.userId?.name || 'N/A' },
              { label: 'Branch', value: session.branchId?.branchName || 'N/A' },
              { label: 'Session Date', value: session.sessionDate ? new Date(session.sessionDate).toLocaleDateString('en-IN') : 'N/A' },
              { label: 'Opened At', value: session.openedAt ? new Date(session.openedAt).toLocaleString('en-IN') : 'N/A' },
              { label: 'Closed At', value: session.closedAt ? new Date(session.closedAt).toLocaleString('en-IN') : '— (Still Open)' },
              { label: 'Status', value: <StatusBadge status={session.status} /> },
              ...(session.remarks ? [{ label: 'Remarks', value: session.remarks }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4">
                <dt className="text-slate-500 font-semibold shrink-0 w-28">{label}</dt>
                <dd className="text-slate-900 dark:text-slate-100 font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </CardWrapper>

        <CardWrapper className="p-5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-4">Denomination Breakdown</h3>
          {openingDenominations?.length === 0 && closingDenominations?.length === 0 && (
            <p className="text-xs text-slate-450 italic">No denomination records available</p>
          )}
          {openingDenominations?.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">Opening</p>
              <div className="space-y-1 mb-4">
                {openingDenominations.map((d) => (
                  <div key={d._id} className="flex justify-between text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400">₹{d.denomination} × {d.count}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{d.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {closingDenominations?.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase border-t border-slate-200 dark:border-slate-800 pt-3">Closing</p>
              <div className="space-y-1">
                {closingDenominations.map((d) => (
                  <div key={d._id} className="flex justify-between text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400">₹{d.denomination} × {d.count}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{d.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardWrapper>
      </div>

      {/* Cash Transaction Register */}
      <CardWrapper className="p-5">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-4">
          Cash Transaction Register ({registerEntries?.length || 0} entries)
        </h3>
        <DataTable columns={registerColumns} data={registerEntries || []} loading={false} />
      </CardWrapper>
    </div>
  );
}
