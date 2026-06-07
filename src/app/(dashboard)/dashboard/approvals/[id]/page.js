'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  RotateCcw
} from 'lucide-react';

import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [approval, setApproval] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Checker inputs
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Session user
      const userRes = await fetch('/api/auth/session');
      if (userRes.ok) {
        const uJson = await userRes.json();
        setCurrentUser(uJson?.user || null);
      }

      // 2. Fetch Approval Detail
      const approvalRes = await fetch(`/api/approvals/${id}`);
      if (approvalRes.ok) {
        const json = await approvalRes.json();
        setApproval(json.data);
      }
    } catch (err) {
      console.error('Failed to load approval details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Execute Decision
  const handleDecision = async (action) => {
    if (action === 'REJECT' && !remarks.trim()) {
      setActionError('Remarks/reasons must be filled when rejecting a request.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remarks }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json.message || 'Operation failed.');
      } else {
        router.push('/dashboard/approvals');
      }
    } catch (err) {
      setActionError('Network connection error.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-950 dark:text-white">Request Not Found</h3>
        <p className="text-xs text-slate-400">The requested approval details could not be found.</p>
        <Link href="/dashboard/approvals" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Queue
        </Link>
      </div>
    );
  }

  const isPending = approval.status === 'PENDING';
  const isMaker = currentUser && approval.requestedBy && approval.requestedBy._id === currentUser.id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/approvals"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Authorization Queue
        </Link>
      </div>

      <PageHeader
        title={`Review Approval Request`}
        subtitle={`Scope: ${approval.moduleName} / ${approval.requestType}`}
      />

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-900/40 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Details */}
        <div className="lg:col-span-2 space-y-6">
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Request Metadata
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date Requested</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {new Date(approval.requestedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Maker (Requested By)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {approval.requestedBy?.fullName} ({approval.requestedBy?.username})
                  </span>
                </div>
              </div>
            </div>
          </CardWrapper>

          {/* Linked Record Details */}
          {approval.contextData && (
            <CardWrapper className="p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
                Document Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                {approval.moduleName === 'TRANSACTION' && (
                  <>
                    <div className="flex items-start gap-3">
                      <Receipt className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction No</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {approval.contextData.transactionNo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Branch</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {approval.contextData.branchId?.branchName || 'Head Office'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Account Details</span>
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mr-2 mt-0.5">
                          {approval.contextData.accountType}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{approval.contextData.accountId}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transaction Type</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {approval.contextData.transactionType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Amount</span>
                        <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                          ₹{approval.contextData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:col-span-2">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Narration</span>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {approval.contextData.narration || 'No narration.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {approval.moduleName === 'REVERSAL' && (
                  <>
                    <div className="flex items-start gap-3">
                      <RotateCcw className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reversal Request ID</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {approval.referenceId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Original Transaction ID</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                          <Link href={`/dashboard/transactions/${approval.contextData.transactionId}`}>
                            Link to Transaction
                          </Link>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:col-span-2">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reason for Reversal</span>
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3 mt-1.5 leading-relaxed">
                          {approval.contextData.reason}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardWrapper>
          )}
        </div>

        {/* Checker Actions Panel */}
        <div>
          <CardWrapper className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3.5 mb-5 uppercase tracking-wider">
              Authorization Action
            </h3>

            {isPending ? (
              isMaker ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200/50 dark:border-amber-900/40 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Maker-Checker restriction: You cannot approve your own request.</span>
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">
                    This request must be reviewed and approved by another cooperative manager or system administrator.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Decision Remarks
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Explain authorization remarks (required for rejection)..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleDecision('REJECT')}
                      disabled={actionLoading}
                      className="inline-flex justify-center items-center px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 text-rose-600 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-sm"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleDecision('APPROVE')}
                      disabled={actionLoading}
                      className="inline-flex justify-center items-center px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                    >
                      Approve & Post
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Decision State</span>
                  <StatusBadge status={approval.status} type={approval.status === 'APPROVED' ? 'success' : 'danger'} />
                </div>

                <div className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex justify-between">
                    <span>Authorized By:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-350">{approval.approvedBy?.fullName || 'SYSTEM'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processed At:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-350">
                      {new Date(approval.approvedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {approval.remarks && (
                    <div className="pt-2">
                      <span className="block font-semibold">Remarks:</span>
                      <p className="mt-1 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 italic">
                        &quot;{approval.remarks}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
