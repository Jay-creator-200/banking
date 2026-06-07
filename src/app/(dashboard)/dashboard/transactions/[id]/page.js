'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  Activity,
  CreditCard,
  DollarSign,
  Clock,
  RotateCcw,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Receipt
} from 'lucide-react';

import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [txn, setTxn] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reversal Request State
  const [reversalOpen, setReversalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState(null);

  // Direct approval states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Fetch Transaction Details & Ledger Entries
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Session user
      const userRes = await fetch('/api/auth/session');
      if (userRes.ok) {
        const uJson = await userRes.json();
        setCurrentUser(uJson?.user || null);
      }

      // 2. Fetch Transaction
      const txnRes = await fetch(`/api/transactions/${id}`);
      if (txnRes.ok) {
        const json = await txnRes.json();
        setTxn(json.data);

        // 3. Fetch Ledger Entries if POSTED
        if (json.data.status === 'POSTED') {
          const ledgerRes = await fetch(`/api/ledger-entries?transactionId=${id}`);
          if (ledgerRes.ok) {
            const lJson = await ledgerRes.json();
            setLedgerEntries(lJson.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle direct cancel (for creator)
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this transaction request?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by operator' }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const errJson = await res.json();
        setActionError(errJson.message || 'Failed to cancel request');
      }
    } catch (err) {
      setActionError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle direct approve (checker)
  const handleApprove = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/transactions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: 'Approved from transaction details page' }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const errJson = await res.json();
        setActionError(errJson.message || 'Failed to approve transaction');
      }
    } catch (err) {
      setActionError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Reversal Request
  const handleRequestReversalSubmit = async () => {
    if (!reversalReason.trim()) {
      setReversalError('Reversal reason is required');
      return;
    }
    setReversalLoading(true);
    setReversalError(null);
    try {
      const res = await fetch('/api/transactions/reversal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, reason: reversalReason }),
      });
      if (res.ok) {
        setReversalOpen(false);
        setReversalReason('');
        fetchData();
      } else {
        const json = await res.json();
        setReversalError(json.message || 'Failed to submit reversal request');
      }
    } catch (err) {
      setReversalError('Network error occurred.');
    } finally {
      setReversalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-950 dark:text-white">Transaction Not Found</h3>
        <p className="text-xs text-slate-400">The requested transaction ID does not exist or has been deleted.</p>
        <Link href="/dashboard/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Register
        </Link>
      </div>
    );
  }

  const isPending = txn.status === 'PENDING';
  const isPosted = txn.status === 'POSTED';
  const isCreator = currentUser && txn.createdBy && txn.createdBy._id === currentUser.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transaction Register
        </Link>
      </div>

      <PageHeader
        title={`Transaction ${txn.transactionNo}`}
        subtitle={`Voucher Reference No: ${txn.referenceNo || 'None'}`}
      >
        <div className="flex items-center gap-3">
          {isPending && isCreator && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 text-rose-600 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-sm"
            >
              Cancel Request
            </button>
          )}

          {isPending && !isCreator && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <ShieldCheck className="w-4 h-4" />
              Authorize Transaction
            </button>
          )}

          {isPosted && (
            <button
              onClick={() => setReversalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 text-amber-600 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Request Reversal
            </button>
          )}
        </div>
      </PageHeader>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-900/40 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-6">
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Transaction Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Branch</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {txn.branchId?.branchName || 'Head Office'} ({txn.branchId?.branchCode || 'HO'})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date / Time</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {new Date(txn.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Account Mapping</span>
                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mr-2 mt-0.5">
                    {txn.accountType}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{txn.accountId}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction Code</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {txn.transactionType.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction Amount</span>
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                    ₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Receipt className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Payment Mode</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {txn.paymentMode} {txn.referenceNo && `- Ref: ${txn.referenceNo}`}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 md:col-span-2">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Narration</span>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                    {txn.narration || 'No narration notes provided.'}
                  </p>
                </div>
              </div>
            </div>
          </CardWrapper>

          {/* Double-Entry Postings */}
          {isPosted && ledgerEntries.length > 0 && (
            <CardWrapper className="p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
                Double-Entry Postings (Ledger Lines)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5">Account Head / Code</th>
                      <th className="py-2.5">Narration</th>
                      <th className="py-2.5 text-right">Debit (₹)</th>
                      <th className="py-2.5 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry._id} className="text-xs text-slate-700 dark:text-slate-300">
                        <td className="py-3 font-semibold">
                          {entry.accountHeadId?.name || 'Unknown Head'}
                          <span className="block text-[9px] font-extrabold text-slate-400 mt-0.5">
                            {entry.accountHeadId?.code}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 max-w-[200px] truncate">{entry.narration}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">
                          {entry.debit > 0 ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-3 text-right font-bold text-rose-500">
                          {entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardWrapper>
          )}
        </div>

        {/* Status / History Column */}
        <div className="space-y-6">
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Verification State
            </h3>

            <div className="space-y-5">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Current Status</span>
                {(() => {
                  let statusStyle = 'warning';
                  if (txn.status === 'POSTED') statusStyle = 'success';
                  if (txn.status === 'CANCELLED') statusStyle = 'danger';
                  if (txn.status === 'REVERSED') statusStyle = 'info';
                  return <StatusBadge status={txn.status} type={statusStyle} />;
                })()}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">Maker / Operator:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {txn.createdBy?.fullName || 'SYSTEM'}
                  </span>
                </div>

                {txn.approvedBy && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Checker / Authorizer:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {txn.approvedBy?.fullName || 'SYSTEM'}
                    </span>
                  </div>
                )}

                {txn.approvedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">Authorized At:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {new Date(txn.approvedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardWrapper>

          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Workflow Timeline
            </h3>

            <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
              {/* Step 1: Create */}
              <div className="flex gap-4 relative">
                <div className="w-5.5 h-5.5 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0 z-10">
                  <Clock className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Transaction Created</h4>
                  <span className="block text-[9px] text-slate-400">{new Date(txn.createdAt).toLocaleString()}</span>
                  <p className="text-[10px] text-slate-400 mt-1">Logged by: {txn.createdBy?.fullName || 'SYSTEM'}</p>
                </div>
              </div>

              {/* Step 2: Processing */}
              {txn.status !== 'CANCELLED' && (
                <div className="flex gap-4 relative">
                  <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    txn.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-950 text-amber-600' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                  }`}>
                    {txn.status === 'PENDING' ? <Clock className="w-3 h-3 animate-pulse" /> : <CheckCircle className="w-3 h-3" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {txn.status === 'PENDING' ? 'Awaiting Authorization' : 'Maker-Checker Cleared'}
                    </h4>
                    {txn.approvedAt && (
                      <span className="block text-[9px] text-slate-400">{new Date(txn.approvedAt).toLocaleString()}</span>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {txn.status === 'PENDING' ? 'Requires authorization from a higher-level user.' : `Authorized by: ${txn.approvedBy?.fullName || 'SYSTEM'}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancellation state */}
              {txn.status === 'CANCELLED' && (
                <div className="flex gap-4 relative">
                  <div className="w-5.5 h-5.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0 z-10">
                    <XCircle className="w-3 h-3" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-600">Cancelled / Rejected</h4>
                    {txn.approvedAt && (
                      <span className="block text-[9px] text-slate-400">{new Date(txn.approvedAt).toLocaleString()}</span>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">Status set to CANCELLED. No entries posted.</p>
                  </div>
                </div>
              )}

              {/* Reversal state */}
              {txn.status === 'REVERSED' && (
                <div className="flex gap-4 relative">
                  <div className="w-5.5 h-5.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0 z-10">
                    <RotateCcw className="w-3 h-3" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-sky-600">Reversal Completed</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Compensating entries posted to reverse all debits and credits.</p>
                  </div>
                </div>
              )}
            </div>
          </CardWrapper>
        </div>
      </div>

      {/* Request Reversal Modal */}
      <ConfirmDialog
        isOpen={reversalOpen}
        onClose={() => setReversalOpen(false)}
        onConfirm={handleRequestReversalSubmit}
        title="Submit Reversal Request"
        confirmText={reversalLoading ? 'Submitting...' : 'Queue Reversal'}
        type="warning"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Reversing this transaction will create a compensating double-entry posting to nullify all balances.
            This action requires checker approval.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Reason for Reversal
            </label>
            <textarea
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Account SB-10023 was entered instead of SB-10024..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
              required
            />
          </div>

          {reversalError && (
            <div className="p-3 rounded-lg bg-rose-50 text-xs font-semibold text-rose-600">
              {reversalError}
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
