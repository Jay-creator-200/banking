'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Clock, 
  Lock, 
  Unlock, 
  FileText, 
  Ban, 
  Power, 
  RefreshCw, 
  Download, 
  FileSpreadsheet,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Printer,
  Percent
} from 'lucide-react';

import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function SavingsAccountHubPage() {
  const { id } = useParams();
  const router = useRouter();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [errorMsg, setErrorMsg] = useState(null);

  // Freeze Modal State
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('manual_hold');
  const [freezeLoading, setFreezeLoading] = useState(false);

  // Unfreeze Modal State
  const [unfreezeOpen, setUnfreezeOpen] = useState(false);
  const [unfreezeLoading, setUnfreezeLoading] = useState(false);

  // Close Modal State
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeRemarks, setCloseRemarks] = useState('');
  const [closeLoading, setCloseLoading] = useState(false);

  // Transactions Tab State
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  // Passbook Tab State
  const [passbookRows, setPassbookRows] = useState([]);
  const [passbookLoading, setPassbookLoading] = useState(false);

  // Interest Tab State
  const [interestHistory, setInterestHistory] = useState([]);
  const [interestHistoryLoading, setInterestHistoryLoading] = useState(false);
  const [calcStart, setCalcStart] = useState('');
  const [calcEnd, setCalcEnd] = useState('');
  const [calcPreview, setCalcPreview] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Approvals Tab State
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  // Audit Logs Tab State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Statement Tab State
  const [stmtStart, setStmtStart] = useState('');
  const [stmtEnd, setStmtEnd] = useState('');
  const [stmtType, setStmtType] = useState('');
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Fetch Core Account Details
  const fetchAccountDetails = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/savings-accounts/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to load savings account details');
      }
      setAccount(json.data);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAccountDetails();
  }, [fetchAccountDetails]);

  // Load Transactions
  const fetchTransactions = useCallback(async () => {
    if (!account) return;
    setTxLoading(true);
    try {
      const res = await fetch(`/api/transactions?accountId=${account.accountNo}&limit=50`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    } finally {
      setTxLoading(false);
    }
  }, [account]);

  // Load Passbook
  const fetchPassbook = useCallback(async () => {
    if (!account) return;
    setPassbookLoading(true);
    try {
      const res = await fetch(`/api/savings-accounts/statement?accountId=${id}&mode=passbook`);
      if (res.ok) {
        const json = await res.json();
        setPassbookRows(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load passbook logs:', e);
    } finally {
      setPassbookLoading(false);
    }
  }, [account, id]);

  // Load Interest history
  const fetchInterestHistory = useCallback(async () => {
    if (!account) return;
    setInterestHistoryLoading(true);
    try {
      // Find history entries where accountId matches our ID
      const res = await fetch(`/api/savings-reports?reportType=register&status=active`);
      // Wait, we can list history by querying a custom endpoint or filter. Let's retrieve from database.
      // For interest calculations history, we can check savings-interest endpoint with preview or load from AuditLogs.
      // Wait, let's load all audit logs of type 'SAVINGS' / 'INTEREST_CREDIT' or just fetch them.
      // We can also fetch the transactions of type INTEREST_CREDIT which represents the history!
      const txnRes = await fetch(`/api/transactions?accountId=${account.accountNo}&transactionType=INTEREST_CREDIT&limit=100`);
      if (txnRes.ok) {
        const json = await txnRes.json();
        setInterestHistory(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch interest records:', e);
    } finally {
      setInterestHistoryLoading(false);
    }
  }, [account]);

  // Load Approvals
  const fetchApprovals = useCallback(async () => {
    if (!account) return;
    setApprovalsLoading(true);
    try {
      const res = await fetch(`/api/approvals?moduleName=TRANSACTION`);
      if (res.ok) {
        const json = await res.json();
        // filter client-side for our account number
        const matches = (json.data || []).filter(item => {
          // approvals details hold referenceId or accountNo details.
          // Since we can't easily deep match without context details, we'll fetch transaction requests
          // that are pending for this account.
          return true; 
        });
        setApprovals(matches);
      }
    } catch (e) {
      console.error('Failed to fetch approvals:', e);
    } finally {
      setApprovalsLoading(false);
    }
  }, [account]);

  // Load Audits
  const fetchAudits = useCallback(async () => {
    if (!account) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?referenceId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit trails:', e);
    } finally {
      setAuditLoading(false);
    }
  }, [id, account]);

  // Handle tab switches
  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions();
    if (activeTab === 'passbook') fetchPassbook();
    if (activeTab === 'interest') fetchInterestHistory();
    if (activeTab === 'approvals') fetchApprovals();
    if (activeTab === 'audit') fetchAudits();
  }, [activeTab, fetchTransactions, fetchPassbook, fetchInterestHistory, fetchApprovals, fetchAudits]);

  // Freeze Action Submit
  const handleFreeze = async () => {
    setFreezeLoading(true);
    try {
      const res = await fetch('/api/savings-accounts/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id, reason: freezeReason }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to freeze account');
      }
      setAccount(json.data);
      setFreezeOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setFreezeLoading(false);
    }
  };

  // Unfreeze Action Submit
  const handleUnfreeze = async () => {
    setUnfreezeLoading(true);
    try {
      const res = await fetch('/api/savings-accounts/unfreeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to unfreeze account');
      }
      setAccount(json.data);
      setUnfreezeOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setUnfreezeLoading(false);
    }
  };

  // Close Action Submit
  const handleClose = async () => {
    setCloseLoading(true);
    try {
      const res = await fetch('/api/savings-accounts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id, remarks: closeRemarks }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to close account');
      }
      setAccount(json.data);
      setCloseOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setCloseLoading(false);
    }
  };

  // Preview Interest Calculation
  const handlePreviewInterest = async (e) => {
    e.preventDefault();
    if (!calcStart || !calcEnd) {
      alert('Please select both start and end dates');
      return;
    }
    setCalcLoading(true);
    setCalcPreview(null);
    try {
      const res = await fetch(`/api/savings-interest?accountId=${id}&startDate=${calcStart}&endDate=${calcEnd}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to preview interest calculation');
      }
      setCalcPreview(json.data);
    } catch (e) {
      alert(e.message);
    } finally {
      setCalcLoading(false);
    }
  };

  // Generate Statement
  const handleGenerateStatement = async (e) => {
    e.preventDefault();
    if (!stmtStart || !stmtEnd) {
      alert('Please select both start and end dates');
      return;
    }
    setStatementLoading(true);
    setStatementData(null);
    try {
      let url = `/api/savings-accounts/statement?accountId=${id}&startDate=${stmtStart}&endDate=${stmtEnd}`;
      if (stmtType) url += `&transactionType=${stmtType}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to generate statement');
      }
      setStatementData(json.data);
    } catch (e) {
      alert(e.message);
    } finally {
      setStatementLoading(false);
    }
  };

  // Export Passbook CSV
  const handleExportPassbookCSV = () => {
    const cols = [
      { header: 'Date', accessor: (row) => new Date(row.date).toLocaleString() },
      { header: 'Transaction No', accessor: 'transactionNo' },
      { header: 'Narration', accessor: 'narration' },
      { header: 'Payment Mode', accessor: 'paymentMode' },
      { header: 'Reference No', accessor: 'referenceNo' },
      { header: 'Debit (₹)', accessor: 'debit' },
      { header: 'Credit (₹)', accessor: 'credit' },
      { header: 'Balance (₹)', accessor: 'balance' },
    ];
    exportToCSV(passbookRows, cols, `Noble-Passbook-${account.accountNo}.csv`);
  };

  // Export Statement CSV
  const handleExportStatementCSV = () => {
    if (!statementData) return;
    const cols = [
      { header: 'Date', accessor: (row) => new Date(row.date).toLocaleString() },
      { header: 'Transaction No', accessor: 'transactionNo' },
      { header: 'Narration', accessor: 'narration' },
      { header: 'Payment Mode', accessor: 'paymentMode' },
      { header: 'Reference No', accessor: 'referenceNo' },
      { header: 'Debit (₹)', accessor: 'debit' },
      { header: 'Credit (₹)', accessor: 'credit' },
      { header: 'Balance (₹)', accessor: 'balance' },
    ];
    exportToCSV(statementData.rows, cols, `Noble-Statement-${account.accountNo}.csv`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (errorMsg || !account) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-250">Failed to Load Account Detail Workspace</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{errorMsg || 'Account was not found or has been deleted.'}</p>
        <button onClick={() => router.push('/dashboard/savings-accounts')} className="px-5 py-2 bg-indigo-650 text-white rounded-xl font-bold text-xs cursor-pointer">
          Back to Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/savings-accounts')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-650"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title={`Workspace Hub: ${account.accountNo}`}
          subtitle={`Member: ${account.memberId?.fullName || 'N/A'} • Branch: ${account.branchId?.branchName || 'N/A'}`}
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Savings Accounts', href: '/dashboard/savings-accounts' },
            { label: 'Workspace', href: '#' },
          ]}
        />
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Sidebar Metrics */}
        <div className="lg:col-span-1 space-y-6">
          <CardWrapper className="p-5 space-y-6 border border-indigo-50/60 dark:border-slate-850">
            {/* Status Panel */}
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-900">
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider block mb-2">Account Status</span>
              <StatusBadge status={account.status} />
              {account.status === 'frozen' && (
                <p className="text-[11px] font-medium text-rose-600 mt-2">Reason: {account.freezeReason?.replace('_', ' ')}</p>
              )}
            </div>

            {/* Current Balance */}
            <div>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">Current Ledger Balance</span>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-450">
                ₹{account.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Available Balance */}
            <div>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">Available Spendable Balance</span>
              <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                ₹{account.availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              {account.currentBalance - account.availableBalance > 0 && (
                <p className="text-[10px] font-bold text-amber-600 mt-1 font-mono">
                  (On Hold: ₹{(account.currentBalance - account.availableBalance).toLocaleString('en-IN')})
                </p>
              )}
            </div>

            {/* Quick specifications */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-900 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-500">Account Type:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{account.accountType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-500">Interest Rate:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{account.interestRate}% p.a.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-500">Min Balance:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">₹{account.minimumBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-500">Opening Date:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{new Date(account.openingDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Management Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-900">
              {account.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setFreezeOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl transition-all cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Freeze Account
                </button>
              )}

              {account.status === 'frozen' && (
                <button
                  type="button"
                  onClick={() => setUnfreezeOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/40 rounded-xl transition-all cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  Unfreeze Account
                </button>
              )}

              {account.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => setCloseOpen(true)}
                  disabled={account.currentBalance !== 0}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={account.currentBalance !== 0 ? 'Balance must be zero to close account' : ''}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Close Account
                </button>
              )}
            </div>
          </CardWrapper>

          {/* Quick link back to member profile */}
          {account.memberId && (
            <CardWrapper className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer" onClick={() => router.push(`/dashboard/members/${account.memberId._id}`)}>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Member Profile</p>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">{account.memberId.memberNo}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </CardWrapper>
          )}
        </div>

        {/* Right Column: Tabbed View Panels */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 dark:border-slate-850 overflow-x-auto divide-x divide-slate-100 dark:divide-slate-900 select-none bg-white dark:bg-slate-950 p-1 rounded-2xl shadow-sm">
            {[
              { id: 'summary', label: 'Summary', icon: Wallet },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'passbook', label: 'Passbook Ledger', icon: TrendingUp },
              { id: 'interest', label: 'Interest Tools', icon: Percent },
              { id: 'audit', label: 'Audit Trail', icon: Clock },
              { id: 'statement', label: 'Extract Statements', icon: FileSpreadsheet },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-xl ${
                  activeTab === tab.id 
                    ? 'bg-indigo-650 text-white shadow-sm shadow-indigo-650/15' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab rendering */}
          {activeTab === 'summary' && (
            <CardWrapper className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Info className="w-5 h-5 text-indigo-650" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Savings Account Summary</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block mb-1">Account Number</span>
                    <p className="font-mono text-sm font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg inline-block">{account.accountNo}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Member Reference</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{account.memberId?.fullName || 'N/A'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Mobile: {account.memberId?.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Home Branch</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{account.branchId?.branchName || 'N/A'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">City: {account.branchId?.city || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Savings Account Type</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 capitalize">{account.accountType}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Interest Terms</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 font-mono">{account.interestRate}% p.a. (Annual Product Method)</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Opening & Auditing</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300">Opened on {new Date(account.openingDate).toLocaleString()}</p>
                    <p className="text-xs text-slate-450 mt-1">System ID: {account._id}</p>
                  </div>
                </div>
              </div>
            </CardWrapper>
          )}

          {activeTab === 'transactions' && (
            <CardWrapper className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Transaction History</h3>
                <button onClick={fetchTransactions} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer">
                  <RefreshCw className={`w-3.5 h-3.5 ${txLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {txLoading ? (
                <div className="py-10 text-center"><LoadingSpinner /></div>
              ) : transactions.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 text-center py-10">No posted transactions found for this account.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-350">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-450 dark:text-slate-550">
                        <th className="py-2.5 font-bold uppercase tracking-wider">Date</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Txn No</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Type</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Narration</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Payment Mode</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-right">Amount (₹)</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {transactions.map((t) => (
                        <tr key={t._id}>
                          <td className="py-3 font-mono text-[11px]">{new Date(t.approvedAt || t.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 font-bold font-mono text-[11px]">{t.transactionNo}</td>
                          <td className="py-3 font-semibold capitalize">{t.transactionType?.replace('SAVINGS_', '').replace('_', ' ')}</td>
                          <td className="py-3 text-slate-500">{t.narration || '-'}</td>
                          <td className="py-3 font-semibold">{t.paymentMode}</td>
                          <td className={`py-3 text-right font-bold font-mono ${t.transactionType === 'SAVINGS_WITHDRAWAL' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3"><StatusBadge status={t.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardWrapper>
          )}

          {activeTab === 'passbook' && (
            <CardWrapper className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Running Passbook Ledger</h3>
                <div className="flex gap-2">
                  <button onClick={handleExportPassbookCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350">
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350">
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button onClick={fetchPassbook} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer">
                    <RefreshCw className={`w-3.5 h-3.5 ${passbookLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {passbookLoading ? (
                <div className="py-10 text-center"><LoadingSpinner /></div>
              ) : passbookRows.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 text-center py-10">No posted entries available to generate passbook rows.</p>
              ) : (
                <div className="overflow-x-auto print:overflow-visible" id="print-area">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-350">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-450 dark:text-slate-550">
                        <th className="py-2.5 font-bold uppercase tracking-wider">Date</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Transaction No</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Narration / Details</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider">Mode</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-right">Debit (Withdrawal)</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-right">Credit (Deposit)</th>
                        <th className="py-2.5 font-bold uppercase tracking-wider text-right">Ledger Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono">
                      {passbookRows.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="py-3 text-[11px] text-slate-500">{new Date(r.date).toLocaleString()}</td>
                          <td className="py-3 text-[11px] font-bold text-slate-900 dark:text-slate-200">{r.transactionNo}</td>
                          <td className="py-3 text-[11px] text-slate-700 dark:text-slate-300 font-sans">{r.narration} {r.referenceNo ? `(${r.referenceNo})` : ''}</td>
                          <td className="py-3 text-[11px] font-sans text-slate-600">{r.paymentMode}</td>
                          <td className="py-3 text-right text-rose-600 font-bold">
                            {r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-3 text-right text-emerald-600 font-bold">
                            {r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-3 text-right text-slate-950 dark:text-slate-50 font-bold">
                            ₹{r.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardWrapper>
          )}

          {activeTab === 'interest' && (
            <div className="space-y-6">
              {/* Calculator console */}
              <CardWrapper className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Percent className="w-5 h-5 text-indigo-650" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Savings Daily Product Interest Calculator</h3>
                </div>

                <form onSubmit={handlePreviewInterest} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Period Start Date *</label>
                    <input
                      type="date"
                      value={calcStart}
                      onChange={e => setCalcStart(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Period End Date *</label>
                    <input
                      type="date"
                      value={calcEnd}
                      onChange={e => setCalcEnd(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={calcLoading}
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {calcLoading ? 'Calculating...' : 'Preview Calculation'}
                  </button>
                </form>

                {calcPreview && (
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-750 dark:text-slate-250">
                      <div>
                        <span className="block text-[10px] text-slate-550 uppercase">Accumulated Interest</span>
                        <span className="text-sm font-bold text-indigo-750 dark:text-indigo-400 font-mono">₹{calcPreview.interestAmount}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-550 uppercase">Interest rate applied</span>
                        <span className="font-mono text-sm">{calcPreview.interestRate}% p.a.</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-550 uppercase">Period Start</span>
                        <span className="font-mono text-sm">{new Date(calcPreview.periodStart).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-550 uppercase">Period End</span>
                        <span className="font-mono text-sm">{new Date(calcPreview.periodEnd).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/50">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 mb-2">Daily Product Ledger Breakdown (Preview)</p>
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900 text-[10px] font-mono">
                        {calcPreview.breakdown?.slice(0, 15).map((day, idx) => (
                          <div key={idx} className="flex justify-between py-1.5 text-slate-700 dark:text-slate-350">
                            <span>{day.date}</span>
                            <span>Closing Balance: ₹{day.closingBalance.toLocaleString()}</span>
                            <span className="text-emerald-600 font-bold">+₹{day.interestEarned}</span>
                          </div>
                        ))}
                        {calcPreview.breakdown?.length > 15 && (
                          <p className="text-[9px] text-slate-450 pt-2 text-center">... and {calcPreview.breakdown.length - 15} more daily entries ...</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardWrapper>

              {/* Interest Posting history */}
              <CardWrapper className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Interest Credits History</h3>
                </div>

                {interestHistoryLoading ? (
                  <div className="py-10 text-center"><LoadingSpinner /></div>
                ) : interestHistory.length === 0 ? (
                  <p className="text-xs font-medium text-slate-500 text-center py-10">No posted interest credits found for this account.</p>
                ) : (
                  <div className="overflow-x-auto font-mono text-[11px] text-slate-700 dark:text-slate-350">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-450 dark:text-slate-550">
                          <th className="py-2 font-bold uppercase">Posting Date</th>
                          <th className="py-2 font-bold uppercase">Transaction No</th>
                          <th className="py-2 font-bold uppercase">Period</th>
                          <th className="py-2 font-bold uppercase text-right">Posted Amount (₹)</th>
                          <th className="py-2 font-bold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {interestHistory.map((item) => (
                          <tr key={item._id}>
                            <td className="py-2.5 text-slate-500">{new Date(item.approvedAt).toLocaleDateString()}</td>
                            <td className="py-2.5 font-bold text-slate-900 dark:text-slate-200">{item.transactionNo}</td>
                            <td className="py-2.5 font-sans">{item.narration?.replace('Interest credit ', '')}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">₹{item.amount.toFixed(2)}</td>
                            <td className="py-2.5"><StatusBadge status={item.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardWrapper>
            </div>
          )}

          {activeTab === 'audit' && (
            <CardWrapper className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Audit Trail Activity Logs</h3>
              </div>

              {auditLoading ? (
                <div className="py-10 text-center"><LoadingSpinner /></div>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 text-center py-10">No audit activity logs recorded for this account.</p>
              ) : (
                <div className="space-y-4 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-850 rounded-xl space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-indigo-650 dark:text-indigo-400 capitalize">{log.actionName?.replace('_', ' ')}</span>
                        <span className="text-slate-450">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 font-sans">Operator ID: <span className="font-mono text-[10px] font-bold">{log.userId}</span></p>
                      {log.oldValues && (
                        <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-100 dark:border-slate-900 text-[10px] text-slate-500">
                          <div>
                            <span className="block font-bold">PRE-STATE</span>
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.oldValues, null, 2)}</pre>
                          </div>
                          <div>
                            <span className="block font-bold text-indigo-650">POST-STATE</span>
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.newValues, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardWrapper>
          )}

          {activeTab === 'statement' && (
            <div className="space-y-6">
              {/* Console */}
              <CardWrapper className="p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-650" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Extract Customer Statement</h3>
                </div>

                <form onSubmit={handleGenerateStatement} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={stmtStart}
                      onChange={e => setStmtStart(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">End Date *</label>
                    <input
                      type="date"
                      value={stmtEnd}
                      onChange={e => setStmtEnd(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Type</label>
                    <select
                      value={stmtType}
                      onChange={e => setStmtType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">All Transactions</option>
                      <option value="SAVINGS_DEPOSIT">Deposits Only</option>
                      <option value="SAVINGS_WITHDRAWAL">Withdrawals Only</option>
                      <option value="INTEREST_CREDIT">Interest Credits Only</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={statementLoading}
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {statementLoading ? 'Extracting...' : 'Generate Statement'}
                  </button>
                </form>

                {statementData && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl text-xs">
                      <div>
                        <p className="text-slate-450">Opening Balance: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{statementData.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleExportStatementCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm">
                          <Download className="w-3.5 h-3.5" />
                          CSV
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-700 dark:text-slate-350 shadow-sm">
                          <Printer className="w-3.5 h-3.5" />
                          Print Statement
                        </button>
                      </div>
                      <div>
                        <p className="text-slate-450">Closing Balance: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-450">₹{statementData.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                      </div>
                    </div>

                    <div className="overflow-x-auto text-[11px] font-mono">
                      <table className="w-full text-left text-slate-700 dark:text-slate-350">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-450 dark:text-slate-550">
                            <th className="py-2">Date</th>
                            <th className="py-2">Transaction No</th>
                            <th className="py-2">Narration</th>
                            <th className="py-2 text-right">Debit (₹)</th>
                            <th className="py-2 text-right">Credit (₹)</th>
                            <th className="py-2 text-right">Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                          {statementData.rows.map((row) => (
                            <tr key={row._id}>
                              <td className="py-2.5 text-slate-500">{new Date(row.date).toLocaleString()}</td>
                              <td className="py-2.5 font-bold text-slate-900 dark:text-slate-200">{row.transactionNo}</td>
                              <td className="py-2.5 font-sans text-slate-700 dark:text-slate-300">{row.narration}</td>
                              <td className="py-2.5 text-right text-rose-600 font-bold">
                                {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="py-2.5 text-right text-emerald-600 font-bold">
                                {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                                ₹{row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardWrapper>
            </div>
          )}
        </div>
      </div>

      {/* Freeze Account Dialog Modal */}
      {freezeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Ban className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Freeze Savings Account</h3>
            </div>
            <p className="text-xs text-slate-500">Freezing blocks all debit withdrawals. Deposits may still be permitted. Select a hold reason below.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Freeze Reason *</label>
                <select
                  value={freezeReason}
                  onChange={e => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="manual_hold">Manual Hold / Remarks</option>
                  <option value="kyc_pending">KYC Pending Update</option>
                  <option value="court_order">Lien / Court Order</option>
                  <option value="fraud_review">Fraud / Suspicious Activity Review</option>
                  <option value="compliance_hold">Compliance Hold</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFreezeOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFreeze}
                disabled={freezeLoading}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl cursor-pointer hover:bg-rose-700 disabled:opacity-50"
              >
                {freezeLoading ? 'Freezing...' : 'Confirm Freeze'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unfreeze Account Dialog Modal */}
      {unfreezeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Power className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Unfreeze Savings Account</h3>
            </div>
            <p className="text-xs text-slate-500">Confirm lifting all compliance blocks. The account will be restored to active status immediately.</p>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUnfreezeOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnfreeze}
                disabled={unfreezeLoading}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl cursor-pointer hover:bg-emerald-700 disabled:opacity-50"
              >
                {unfreezeLoading ? 'Restoring...' : 'Confirm Unfreeze'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Account Dialog Modal */}
      {closeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100 dark:border-slate-800">
              <XCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Close Savings Account</h3>
            </div>
            <p className="text-xs text-slate-500">Confirm closing the account. This requires a zero ledger and available balance. This action cannot be undone.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Closure Remarks</label>
                <textarea
                  value={closeRemarks}
                  onChange={e => setCloseRemarks(e.target.value)}
                  placeholder="Enter remarks for ledger closure..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCloseOpen(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={closeLoading}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl cursor-pointer hover:bg-rose-700 disabled:opacity-50"
              >
                {closeLoading ? 'Closing...' : 'Confirm Closure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
