'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Download,
  Filter,
  Eye,
  X,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Receipt
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
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
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drawer / Creation Form
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    branchId: '',
    memberId: '',
    accountType: 'savings',
    accountId: '',
    transactionType: 'SAVINGS_DEPOSIT',
    paymentMode: 'CASH',
    amount: '',
    referenceNo: '',
    narration: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formGlobalError, setFormGlobalError] = useState(null);

  // Load branches for drop-down
  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches?limit=100');
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data);
        if (json.data.length > 0) {
          setFormData((prev) => ({ ...prev, branchId: json.data[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  }, []);

  // Fetch transactions list
  const fetchTransactions = useCallback(async () => {
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
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('transactionType', typeFilter);
      if (accountTypeFilter) params.append('accountType', accountTypeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortField, sortOrder, search, branchFilter, statusFilter, typeFilter, accountTypeFilter, startDate, endDate]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSort = (field, order) => {
    setSortField(field);
    setSortOrder(order);
  };

  // CSV Export
  const handleExport = () => {
    const cols = [
      { header: 'Transaction No', accessor: 'transactionNo' },
      { header: 'Date', cellValue: (row) => new Date(row.createdAt).toLocaleString() },
      { header: 'Branch', cellValue: (row) => row.branchId?.branchName || 'N/A' },
      { header: 'Account Type', accessor: 'accountType' },
      { header: 'Account ID', accessor: 'accountId' },
      { header: 'Txn Type', accessor: 'transactionType' },
      { header: 'Payment Mode', accessor: 'paymentMode' },
      { header: 'Amount', accessor: 'amount' },
      { header: 'Status', accessor: 'status' },
      { header: 'Narration', accessor: 'narration' },
    ];
    exportToCSV(transactions, cols, 'Noble-Transactions-Export.csv');
  };

  // Submit new transaction request
  const handleSubmit = async () => {
    setFormLoading(true);
    setFormGlobalError(null);
    setFormErrors({});
    
    // Client-side quick check
    const errors = {};
    if (!formData.branchId) errors.branchId = 'Branch is required';
    if (!formData.accountId) errors.accountId = 'Account number/id is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = 'Amount must be greater than zero';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        memberId: formData.memberId || undefined,
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.errors) {
          setFormErrors(json.errors);
        } else {
          setFormGlobalError(json.message || 'Failed to submit transaction request');
        }
      } else {
        // Clear & Reload
        setDrawerOpen(false);
        setFormData({
          branchId: branches[0]?._id || '',
          memberId: '',
          accountType: 'savings',
          accountId: '',
          transactionType: 'SAVINGS_DEPOSIT',
          paymentMode: 'CASH',
          amount: '',
          referenceNo: '',
          narration: '',
        });
        fetchTransactions();
      }
    } catch (err) {
      setFormGlobalError('Network communication failure.');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Transaction ID / Date',
      accessor: 'transactionNo',
      cell: ({ row }) => (
        <div>
          <Link
            href={`/dashboard/transactions/${row._id}`}
            className="font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {row.transactionNo}
          </Link>
          <span className="block text-[10px] text-slate-400 mt-0.5">
            {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Branch',
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.branchId?.branchName || 'Head Office'}
        </span>
      ),
    },
    {
      header: 'Account Info',
      accessor: 'accountId',
      cell: ({ row }) => (
        <div>
          <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-0.5">
            {row.accountType}
          </span>
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-250">
            {row.accountId}
          </span>
        </div>
      ),
    },
    {
      header: 'Type / Mode',
      accessor: 'transactionType',
      cell: ({ row }) => (
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {row.transactionType.replace('_', ' ')}
          </span>
          <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
            {row.paymentMode}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: ({ row }) => (
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
          ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ row }) => {
        let statusStyle = 'warning';
        if (row.status === 'POSTED') statusStyle = 'success';
        if (row.status === 'CANCELLED') statusStyle = 'danger';
        if (row.status === 'REVERSED') statusStyle = 'info';
        return <StatusBadge status={row.status} type={statusStyle} />;
      },
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/transactions/${row._id}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition"
          >
            <Eye className="w-3.5 h-3.5" />
            Details
          </Link>
          {row.status === 'POSTED' && (
            <Link
              href={`/dashboard/receipts/transaction/${row._id}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            >
              <Receipt className="w-3.5 h-3.5" />
              Print
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Register"
        subtitle="Manage financial logs, voucher postings, and transaction approvals"
      >
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </button>
        </div>
      </PageHeader>

      {/* Filters Area */}
      <CardWrapper className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchInput
                placeholder="Search by Transaction ID, Cheque/Reference, Account No..."
                onSearch={handleSearch}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Branch
              </label>
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="POSTED">Posted (Success)</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="SAVINGS_DEPOSIT">Savings Deposit</option>
                <option value="SAVINGS_WITHDRAWAL">Savings Withdrawal</option>
                <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
                <option value="LOAN_INSTALLMENT">Loan Installment</option>
                <option value="SHARE_PURCHASE">Share Purchase</option>
                <option value="MEMBERSHIP_FEE">Membership Fee</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Account Type
              </label>
              <select
                value={accountTypeFilter}
                onChange={(e) => { setAccountTypeFilter(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Accounts</option>
                <option value="savings">Savings</option>
                <option value="loan">Loan</option>
                <option value="scheme">Deposit Scheme</option>
                <option value="share">Share Capital</option>
                <option value="membership">Membership</option>
                <option value="interest">Interest Account</option>
                <option value="general">General Head</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </CardWrapper>

      {/* Data Table */}
      <CardWrapper className="overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={transactions}
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

      {/* Creation Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Log Transaction Request"
      >
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel="Queue Transaction"
          loading={formLoading}
          error={formGlobalError}
        >
          <div className="space-y-4">
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
                  <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Account Type
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                >
                  <option value="savings">Savings</option>
                  <option value="loan">Loan</option>
                  <option value="scheme">Deposit Scheme</option>
                  <option value="share">Share Capital</option>
                  <option value="membership">Membership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Account Reference / ID
                </label>
                <input
                  type="text"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  placeholder="e.g. SB-10023"
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 focus:outline-none ${
                    formErrors.accountId ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  required
                />
                {formErrors.accountId && <p className="text-xs text-rose-500 mt-1">{formErrors.accountId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Transaction Type
                </label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                >
                  <option value="SAVINGS_DEPOSIT">Savings Deposit</option>
                  <option value="SAVINGS_WITHDRAWAL">Savings Withdrawal</option>
                  <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
                  <option value="LOAN_INSTALLMENT">Loan Installment</option>
                  <option value="SHARE_PURCHASE">Share Purchase</option>
                  <option value="MEMBERSHIP_FEE">Membership Fee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="RTGS">RTGS</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 focus:outline-none ${
                    formErrors.amount ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  required
                />
                {formErrors.amount && <p className="text-xs text-rose-500 mt-1">{formErrors.amount}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Reference / Cheque No
                </label>
                <input
                  type="text"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  placeholder="e.g. CHQ-400123"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Member ID (Optional)
              </label>
              <input
                type="text"
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                placeholder="Database ObjectId if known"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Narration / Notes
              </label>
              <textarea
                value={formData.narration}
                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                placeholder="Provide standard transaction explanation..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: For loan installments, include &quot;Principal: X, Interest: Y&quot; to post split entries.
              </p>
            </div>
          </div>
        </FormWrapper>
      </Drawer>
    </div>
  );
}
