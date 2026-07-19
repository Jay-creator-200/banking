'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';

import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

export default function VoucherDetailPage() {
  const { id } = useParams();

  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchVoucher = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal-vouchers/${id}`);
      if (res.ok) {
        const json = await res.json();
        setVoucher(json.data);
      }
    } catch (err) {
      console.error('Failed to load voucher details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVoucher();
  }, [fetchVoucher]);

  if (loading) {
    return (
      <div className="py-40 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-950 dark:text-white">Voucher Not Found</h3>
        <p className="text-xs text-slate-400">The requested voucher details could not be found.</p>
        <Link href="/dashboard/journal-vouchers" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Register
        </Link>
      </div>
    );
  }

  const totalDebit = voucher.entries?.reduce((sum, e) => sum + e.debit, 0) || 0;
  const totalCredit = voucher.entries?.reduce((sum, e) => sum + e.credit, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/journal-vouchers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Voucher Register
        </Link>
      </div>

      <PageHeader
        title={`Voucher ${voucher.voucherNo}`}
        subtitle={`Double-Entry Bookkeeping Record`}
        action={
          <Link
            href={`/dashboard/receipts/voucher/${voucher._id}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            Print Receipt
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Voucher Header Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Branch</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {voucher.branchId?.branchName || 'Head Office'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voucher Date</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {new Date(voucher.voucherDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voucher Type</span>
                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {voucher.voucherType}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 md:col-span-2">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">General Narration</span>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                    {voucher.narration || 'No narration.'}
                  </p>
                </div>
              </div>
            </div>
          </CardWrapper>

          {/* Ledger Entries List */}
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Double-Entry Ledger Lines
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5">Account Head / Code</th>
                    <th className="py-2.5">Line Description</th>
                    <th className="py-2.5 text-right">Debit (₹)</th>
                    <th className="py-2.5 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {voucher.entries?.map((entry) => (
                    <tr key={entry._id} className="text-xs text-slate-700 dark:text-slate-350">
                      <td className="py-3 font-bold">
                        {entry.accountHeadId?.name || 'Unknown Head'}
                        <span className="block text-[9px] font-extrabold text-slate-450 mt-0.5">
                          {entry.accountHeadId?.code}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 max-w-[200px] truncate">{entry.narration || '-'}</td>
                      <td className="py-3 text-right font-extrabold text-emerald-600">
                        {entry.debit > 0 ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 text-right font-extrabold text-rose-500">
                        {entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800 font-extrabold text-xs text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/10">
                    <td className="py-3 pl-3" colSpan={2}>Voucher Summary Totals</td>
                    <td className="py-3 text-right text-emerald-600">₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-right text-rose-500">₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardWrapper>
        </div>

        {/* Audit Column */}
        <div>
          <CardWrapper className="p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Posting Audit
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">Created By:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {voucher.createdBy?.fullName || 'SYSTEM'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">Date Posted:</span>
                <span className="font-bold text-slate-700 dark:text-slate-350">
                  {new Date(voucher.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">System Status:</span>
                <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  POSTED
                </span>
              </div>
            </div>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
