'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Percent,
  TrendingUp,
  Award,
  CircleAlert
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function MemberReportsPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Filters
  const [reportType, setReportType] = useState('member-register');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches?limit=100');
        if (res.ok) {
          const json = await res.json();
          setBranches(json.data || []);
        }
      } catch (e) {
        console.error('Failed to load branches:', e);
      }
    }
    loadBranches();
  }, []);

  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    try {
      let url = `/api/member-reports?reportType=${reportType}`;
      if (branchFilter) url += `&branchId=${branchFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.data);
      }
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setLoading(false);
    }
  }, [reportType, branchFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    handleGenerateReport();
  }, [handleGenerateReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!reportData) return;

    let exportRows = [];
    let cols = [];

    if (reportType === 'share-capital') {
      exportRows = reportData.certificates || [];
      cols = [
        { header: 'Certificate No', accessor: 'certificateNo' },
        { header: 'Member Name', accessor: (row) => row.memberId?.fullName || 'N/A' },
        { header: 'Shares Issued', accessor: 'sharesIssued' },
        { header: 'Share Value (₹)', accessor: 'shareValue' },
        { header: 'Total Amount (₹)', accessor: 'totalAmount' },
        { header: 'Issued Date', accessor: 'issuedDate' },
        { header: 'Status', accessor: 'status' }
      ];
    } else if (reportType === 'membership-fees') {
      exportRows = reportData.transactions || [];
      cols = [
        { header: 'Transaction No', accessor: 'transactionNo' },
        { header: 'Member Name', accessor: (row) => row.memberId?.fullName || 'N/A' },
        { header: 'Payment Mode', accessor: 'paymentMode' },
        { header: 'Amount (₹)', accessor: 'amount' },
        { header: 'Status', accessor: 'status' },
        { header: 'Date', accessor: 'createdAt' }
      ];
    } else {
      exportRows = reportData.members || [];
      cols = [
        { header: 'Member No', accessor: 'memberNo' },
        { header: 'Full Name', accessor: 'fullName' },
        { header: 'Mobile', accessor: 'mobile' },
        { header: 'KYC Status', accessor: 'kycStatus' },
        { header: 'Status', accessor: 'memberStatus' },
        { header: 'Category', accessor: 'memberCategory' }
      ];
    }

    exportToCSV(exportRows, cols, `Noble-Report-${reportType}.csv`);
  };

  // Define Columns dynamically based on chosen Report Type
  const getColumns = () => {
    if (reportType === 'share-capital') {
      return [
        {
          header: 'Certificate No',
          accessor: 'certificateNo',
          cell: ({ value }) => <span className="font-mono font-bold text-xs">{value}</span>
        },
        {
          header: 'Member Name',
          cell: ({ row }) => (
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{row.memberId?.fullName || 'N/A'}</p>
              <p className="text-[10px] text-slate-450 font-mono mt-0.5">{row.memberId?.memberNo || 'N/A'}</p>
            </div>
          )
        },
        {
          header: 'Shares Issued',
          accessor: 'sharesIssued',
          cell: ({ value }) => <span className="font-mono text-xs font-semibold">{value}</span>
        },
        {
          header: 'Share Value',
          accessor: 'shareValue',
          cell: ({ value }) => <span className="font-mono text-xs font-semibold">₹{value}.00</span>
        },
        {
          header: 'Total Amount',
          accessor: 'totalAmount',
          cell: ({ value }) => <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400">₹{value.toLocaleString()}</span>
        },
        {
          header: 'Status',
          accessor: 'status',
          cell: ({ value }) => <StatusBadge status={value} />
        }
      ];
    }

    if (reportType === 'membership-fees') {
      return [
        {
          header: 'Transaction No',
          accessor: 'transactionNo',
          cell: ({ value }) => <span className="font-mono font-bold text-xs">{value || 'PENDING ASSIGNMENT'}</span>
        },
        {
          header: 'Member Name',
          cell: ({ row }) => (
            <div>
              <p className="font-bold text-slate-850 dark:text-slate-200">{row.memberId?.fullName || 'N/A'}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.memberId?.memberNo || 'N/A'}</p>
            </div>
          )
        },
        {
          header: 'Payment Mode',
          accessor: 'paymentMode',
          cell: ({ value }) => <span className="text-xs font-bold text-slate-650 bg-slate-100 px-2 py-0.5 rounded">{value}</span>
        },
        {
          header: 'Amount',
          accessor: 'amount',
          cell: ({ value }) => <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">₹{value}.00</span>
        },
        {
          header: 'Status',
          accessor: 'status',
          cell: ({ value }) => <StatusBadge status={value} />
        },
        {
          header: 'Date Created',
          accessor: 'createdAt',
          cell: ({ value }) => <span className="text-[11px] font-mono text-slate-500">{new Date(value).toLocaleDateString()}</span>
        }
      ];
    }

    // Default Member registers
    return [
      {
        header: 'Member No',
        accessor: 'memberNo',
        cell: ({ value }) => <span className="font-mono font-bold text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 px-2 py-0.5 rounded">{value}</span>
      },
      {
        header: 'Full Name',
        accessor: 'fullName',
        cell: ({ value, row }) => (
          <div>
            <p className="font-bold text-slate-850 dark:text-slate-150">{value}</p>
            <p className="text-[10px] text-slate-450 mt-0.5">{row.mobile} • {row.memberCategory}</p>
          </div>
        )
      },
      {
        header: 'KYC Status',
        accessor: 'kycStatus',
        cell: ({ value }) => <StatusBadge status={value} />
      },
      {
        header: 'Account Status',
        accessor: 'memberStatus',
        cell: ({ value }) => <StatusBadge status={value} />
      },
      {
        header: 'District / City',
        cell: ({ row }) => <span className="text-xs text-slate-700">{row.city}, {row.district}</span>
      }
    ];
  };

  const currentData = reportType === 'share-capital' 
    ? (reportData?.certificates || []) 
    : reportType === 'membership-fees' 
      ? (reportData?.transactions || []) 
      : (reportData?.members || []);

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title="Member & Capital Reporting"
          subtitle="Generate audit-ready registers, KYC checklists, share ledger registers, and membership fee reports."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Reports', href: '#' }
          ]}
          action={
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white text-slate-750 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print PDF
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-650 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          }
        />
      </div>

      {/* Print-only banking letterhead header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4 text-center">
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-950">Noble Cooperative Bank</h2>
        <p className="text-xs font-mono mt-1">Audit-Ready Ledger Systems • Member Capital Report</p>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-3">
          <span>Report Scope: {reportType.replace('-', ' ').toUpperCase()}</span>
          <span>Printed At: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Control Filters panel */}
      <CardWrapper className="p-5 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Report Template</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setStatusFilter('');
                setCategoryFilter('');
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
            >
              <option value="member-register">General Member Register</option>
              <option value="kyc-pending">KYC Pending Directory</option>
              <option value="status-based">Status Lifecycle Lists</option>
              <option value="share-capital">Share Capital Register</option>
              <option value="membership-fees">Membership Fee Collections</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Branch Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.branchName}</option>
              ))}
            </select>
          </div>

          {/* Conditional Filters based on template */}
          {reportType === 'status-based' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Status Group</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
              >
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>
          )}

          {reportType === 'member-register' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-2">Member Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="senior_citizen">Senior Citizen</option>
                  <option value="staff">Staff</option>
                  <option value="farmer">Farmer</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </>
          )}

          <div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-950 hover:bg-slate-900 dark:bg-indigo-650 dark:hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>
        </div>
      </CardWrapper>

      {/* Share Capital aggregate details summary stats if selected */}
      {reportType === 'share-capital' && reportData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active Certificates</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{reportData.summary.totalCertificates}</span>
            </div>
            <Award className="w-8 h-8 text-indigo-600 dark:text-indigo-400 opacity-80" />
          </div>

          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Shares Issued</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{reportData.summary.totalShares.toLocaleString()}</span>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400 opacity-80" />
          </div>

          <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Share Capital Value</span>
              <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">₹{reportData.summary.totalAmount.toLocaleString()}</span>
            </div>
            <Percent className="w-8 h-8 text-indigo-600 dark:text-indigo-400 opacity-80" />
          </div>
        </div>
      )}

      {/* Reports Table details list */}
      <CardWrapper className="p-5">
        <DataTable
          columns={getColumns()}
          data={currentData}
          loading={loading}
        />
        <div className="mt-3 text-right text-xs font-bold text-slate-450 dark:text-slate-500">
          Generated total: {currentData.length} records matching criteria
        </div>
      </CardWrapper>
    </div>
  );
}
