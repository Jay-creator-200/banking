'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { 
  Users, 
  Building, 
  History, 
  ShieldAlert, 
  Database,
  CloudLightning,
  Layers,
  Terminal,
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  UploadCloud, 
  RefreshCw,
  FolderOpen,
  Wallet,
  Landmark,
  PiggyBank,
  Coins,
  ArrowRightLeft,
  Vault,
  MapPin,
  ShieldCheck,
  Calendar,
  Building2
} from 'lucide-react';

import Link from 'next/link';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import Modal from '@/components/shared/Modal.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

import { emailSchema, mobileSchema, passwordSchema } from '@/schemas/common/index.js';

// Raw mock logs data for table verification
const mockLogs = [
  { _id: '1', event: 'Database Connection Pool Init', operator: 'SYSTEM', status: 'ACTIVE', timestamp: '2026-06-07T12:00:00Z', notes: 'Mongoose singleton instance constructed successfully.' },
  { _id: '2', event: 'Cloudinary API Gateway Bound', operator: 'SYSTEM', status: 'ACTIVE', timestamp: '2026-06-07T12:05:00Z', notes: 'Using local developer mock fallbacks.' },
  { _id: '3', event: 'Audit Log Indexes Constructed', operator: 'SYSTEM', status: 'ACTIVE', timestamp: '2026-06-07T12:10:00Z', notes: 'Ensured compound index on isDeleted and createdAt.' },
  { _id: '4', event: 'Register Branch: Pune Central Office', operator: 'SUPER_ADMIN', status: 'PENDING_APPROVAL', timestamp: '2026-06-07T12:15:00Z', notes: 'Awaiting secondary executive workflow approval.' },
  { _id: '5', event: 'Failed login attempt: root-ssh-agent', operator: 'GUEST', status: 'REJECTED', timestamp: '2026-06-07T12:20:00Z', notes: 'Origin block list matched. IP flagged.' },
  { _id: '6', event: 'Cooperative KYC File validation test', operator: 'TELLER', status: 'DRAFT', timestamp: '2026-06-07T12:25:00Z', notes: 'Testing 5MB maximum file boundaries.' },
  { _id: '7', event: 'Interest compounding engine warmup', operator: 'SYSTEM', status: 'INACTIVE', timestamp: '2026-06-07T12:30:00Z', notes: 'Idle until accounts ledger phase.' },
];

export default function DashboardHome() {
  // Page UI State
  const [activeTab, setActiveTab] = useState('components');
  const [showSandbox, setShowSandbox] = useState(false);
  
  // Real stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Data Table and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const itemsPerPage = 3;

  // Dialog overlay trigger states
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Form states and field validations
  const [formData, setFormData] = useState({ email: '', mobile: '', password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Upload simulation states
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fetch Database Advanced Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/advanced-stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json.data?.stats || null);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Filter and paginate mock data
  const filteredLogs = mockLogs.filter(log => 
    log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.operator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle Search Input Change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Trigger cache purge confirmation
  const handlePurgeConfirm = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
      alert('Mock System audit log cache successfully purged!');
    }, 1500);
  };

  // Form Submit with Zod Validator integration
  const handleFormSubmit = (e) => {
    setFormLoading(true);
    setFormSuccess(false);
    setFormErrors({});

    setTimeout(() => {
      const errors = {};
      
      // Zod Validation Checks
      const emailRes = emailSchema.safeParse(formData.email);
      if (!emailRes.success) {
        errors.email = emailRes.error.errors[0].message;
      }

      const mobileRes = mobileSchema.safeParse(formData.mobile);
      if (!mobileRes.success) {
        errors.mobile = mobileRes.error.errors[0].message;
      }

      const passwordRes = passwordSchema.safeParse(formData.password);
      if (!passwordRes.success) {
        errors.password = passwordRes.error.errors[0].message;
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setFormLoading(false);
      } else {
        setFormSuccess(true);
        setFormLoading(false);
      }
    }, 1000);
  };

  // Upload simulation
  const handleUploadSim = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds 5MB size limit.');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    setTimeout(() => {
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample_kyc_doc.jpg',
        public_id: `mock_cloudinary_${Date.now()}`
      });
      setUploadLoading(false);
    }, 1800);
  };

  // Columns definition for DataTable
  const tableColumns = [
    {
      header: 'System Event Name',
      accessor: 'event',
      cell: ({ value }) => (
        <span className="font-bold text-slate-800 dark:text-slate-200">{value}</span>
      ),
    },
    {
      header: 'Triggered By',
      accessor: 'operator',
      cell: ({ value }) => (
        <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-350">
          {value}
        </span>
      ),
    },
    {
      header: 'Audit Status',
      accessor: 'status',
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRow(row);
              setDrawerOpen(true);
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-650 transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Noble Cooperative Society" 
        subtitle="Operational summary and performance metrics for Noble Cooperative Society Udaipur Hub."
        breadcrumbs={[
          { label: 'Platform Core', href: '#' },
          { label: 'Dashboard', href: '/dashboard' }
        ]}
        action={
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setStatsLoading(true);
                fetchStats();
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350 animate-in fade-in duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Dashboard
            </button>
          </div>
        }
      />

      {/* Selected Branch Info Header Banner */}
      <CardWrapper className="p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-indigo-500/25 text-indigo-300 rounded-lg">
                <Building2 className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-white tracking-wide">
                {statsLoading ? 'Loading branch...' : (stats?.branchName || 'Udaipur Branch')}
              </h3>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>12, Saheli Marg, Near Saheliyon-ki-Bari, Udaipur, Rajasthan, 313001</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <div className="px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-300" />
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Business Date</span>
                <span className="font-mono text-slate-200">2026-06-15</span>
              </div>
            </div>
            <div className="px-3.5 py-2 bg-emerald-950/30 border border-emerald-900/40 rounded-xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="block text-[9px] text-emerald-400 uppercase font-bold">Status</span>
                <span className="text-emerald-300">Operational Hub</span>
              </div>
            </div>
          </div>
        </div>
      </CardWrapper>

      {/* Integration Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <Link href="/dashboard/members" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-450 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Members</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : (stats?.totalMembers || 0)}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Active Registry</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        {/* Active Savings Accounts */}
        <Link href="/dashboard/savings-accounts" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-sky-650 dark:text-sky-450 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Savings</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : (stats?.activeSavings || 0)} Accounts
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Interest bearing profiles</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        {/* Deposit Portfolio */}
        <Link href="/dashboard/reports" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 flex items-center justify-center shrink-0">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Deposit Liabilities</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : formatCurrency(stats?.depositLiability)}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Total Deposit Pool</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        {/* Loan Portfolio */}
        <Link href="/dashboard/loans" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-650 dark:text-rose-450 flex items-center justify-center shrink-0">
                <Landmark className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loan Outstanding</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : formatCurrency(stats?.loanOutstanding)}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Active Loan Book</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        {/* Today's Collection */}
        <Link href="/dashboard/transactions" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-650 dark:text-amber-450 flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today&apos;s Inflow</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : formatCurrency(stats?.todayCollection)}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Collections collected</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        {/* Today's Withdrawal */}
        <Link href="/dashboard/transactions" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-650 dark:text-orange-450 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today&apos;s Outflow</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : formatCurrency(stats?.todayWithdrawal)}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Withdrawals paid</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        {/* Cash Position */}
        <Link href="/dashboard/teller/vault" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block sm:col-span-2">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-450 flex items-center justify-center shrink-0">
                <Vault className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cash Position</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {statsLoading ? '...' : formatCurrency(stats?.cashPosition)}
                </h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 block">Total vault & teller cash in hand</span>
              </div>
            </div>
          </CardWrapper>
        </Link>
      </div>

      {/* Developer Sandbox Section Toggle */}
      <div className="pt-4">
        <button 
          onClick={() => setShowSandbox(!showSandbox)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 shadow-sm"
        >
          <Terminal className="w-4 h-4 text-indigo-550" />
          <span>{showSandbox ? 'Collapse Developer Primitives' : 'Expand Developer Sandbox'}</span>
        </button>

        {showSandbox && (
          <div className="mt-4 border border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm animate-in slide-in-from-top-4 duration-300">
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setActiveTab('components')}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'components'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                UI Components & Data Table
              </button>
              <button
                onClick={() => setActiveTab('validation')}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'validation'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                Zod Form Validation
              </button>
              <button
                onClick={() => setActiveTab('storage')}
                className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'storage'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                }`}
              >
                Cloudinary Upload Sandbox
              </button>
            </div>

            <div className="p-6">
              {/* TAB 1: UI COMPONENTS & DATATABLE */}
              {activeTab === 'components' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Audit Logs & Primitives Explorer</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Interactively review and paginate through core system events logs.</p>
                    </div>
                    <SearchInput 
                      value={searchTerm} 
                      onChange={handleSearchChange} 
                      placeholder="Search logs or operator..." 
                    />
                  </div>

                  {/* Data Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <DataTable
                      columns={tableColumns}
                      data={paginatedLogs}
                      loading={tableLoading}
                      onRowClick={(row) => {
                        setSelectedRow(row);
                        setDrawerOpen(true);
                      }}
                    />
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={(page) => setCurrentPage(page)}
                    />
                  </div>

                  {/* Overlay Trigger Button Panel */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Dialog & Feedback Primitives</h4>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setModalOpen(true)}
                        className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-650 text-white transition-all cursor-pointer shadow-sm shadow-indigo-600/10"
                      >
                        Open System Modal
                      </button>
                      <button
                        onClick={() => setConfirmOpen(true)}
                        className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-750 text-white transition-all cursor-pointer shadow-sm shadow-rose-600/10"
                      >
                        Flush Log Cache (Double Confirm)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ZOD VALIDATION */}
              {activeTab === 'validation' && (
                <div className="max-w-xl mx-auto space-y-6 py-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 text-center">Zod Validation Sandbox</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                      Submit this secure credential bundle to test client-side schema assertions (Indian Mobile, Email, Passwords).
                    </p>
                  </div>

                  <CardWrapper className="bg-slate-50/20 dark:bg-slate-900/10 border-slate-150">
                    {formSuccess && (
                      <div className="mb-4 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>Zod Schema validation passed successfully! Credentials match core regulations.</span>
                      </div>
                    )}

                    <FormWrapper
                      onSubmit={handleFormSubmit}
                      submitLabel="Test Validation"
                      loading={formLoading}
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">
                            Email Address
                          </label>
                          <input
                            type="text"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                              formErrors.email
                                ? 'border-rose-350 focus:ring-rose-200 focus:border-rose-450'
                                : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500'
                            }`}
                            placeholder="coop.admin@cooperative.in"
                          />
                          {formErrors.email && (
                            <p className="text-xs text-rose-600 mt-1.5 font-medium">{formErrors.email}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">
                            Indian Mobile Number
                          </label>
                          <input
                            type="text"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                              formErrors.mobile
                                ? 'border-rose-350 focus:ring-rose-200 focus:border-rose-450'
                                : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500'
                            }`}
                            placeholder="9876543210"
                          />
                          {formErrors.mobile && (
                            <p className="text-xs text-rose-600 mt-1.5 font-medium">{formErrors.mobile}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase mb-1.5">
                            Secure System Password
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                              formErrors.password
                                ? 'border-rose-350 focus:ring-rose-200 focus:border-rose-450'
                                : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500'
                            }`}
                            placeholder="••••••••"
                          />
                          {formErrors.password && (
                            <p className="text-xs text-rose-600 mt-1.5 font-medium">{formErrors.password}</p>
                          )}
                        </div>
                      </div>
                    </FormWrapper>
                  </CardWrapper>
                </div>
              )}

              {/* TAB 3: CLOUDINARY SANDBOX */}
              {activeTab === 'storage' && (
                <div className="max-w-xl mx-auto space-y-6 py-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 text-center">Cloudinary Storage Simulator</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                      Verify mock/live document uploads restricted by our banking storage boundaries (5MB Max size constraint).
                    </p>
                  </div>

                  <CardWrapper className="bg-slate-50/20 dark:bg-slate-900/10 border-slate-150">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 text-center">
                      <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-350">Drag or click to choose a KYC document</p>
                      <p className="text-xs text-slate-400 mt-1">Accepts images, PDF, Word documents up to 5MB.</p>
                      
                      <input
                        type="file"
                        id="file-upload-sim"
                        className="hidden"
                        onChange={handleUploadSim}
                        disabled={uploadLoading}
                      />
                      <label
                        htmlFor="file-upload-sim"
                        className="mt-4 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-600/15"
                      >
                        Select File
                      </label>
                    </div>

                    {uploadLoading && (
                      <div className="flex items-center justify-center gap-3 mt-5 p-4 rounded-xl border border-indigo-100/50 bg-indigo-50/10 dark:bg-indigo-950/5 text-indigo-600 dark:text-indigo-450">
                        <LoadingSpinner size="sm" />
                        <span className="text-xs font-semibold">Uploading via UploadService ...</span>
                      </div>
                    )}

                    {uploadError && (
                      <div className="flex items-center gap-2 mt-5 p-4 rounded-xl border border-rose-100 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {uploadedFile && (
                      <div className="mt-5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <FolderOpen className="w-4 h-4 text-slate-400" />
                            <span>Uploaded Asset Metadata</span>
                          </div>
                          <button
                            onClick={() => setUploadedFile(null)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">File Name:</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-350 truncate">{uploadedFile.name}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">File Size:</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-350">{uploadedFile.size}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Public ID:</span>
                            <p className="font-mono text-slate-700 dark:text-slate-300 truncate">{uploadedFile.public_id}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Secure URL Link:</span>
                            <a
                              href={uploadedFile.secure_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-indigo-650 dark:text-indigo-400 font-semibold hover:underline truncate"
                            >
                              View Uploaded Asset
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardWrapper>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY 1: MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cooperative Administration Core Settings"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed">
            This modal demonstrates support for <strong>Escape key listeners</strong>, <strong>scroll locks</strong>, and <strong>glassmorphism backdrop blurs</strong>.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-xs font-mono text-slate-500 space-y-1">
            <p>{'// Settings Metadata Info'}</p>
            <p>DB_POOL_MAX_SIZE: 10</p>
            <p>DEFAULT_INTEREST_ROUNDING: HALF_UP</p>
            <p>ALLOW_OFFLINE_TRANSACTIONS: false</p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Close Settings
            </button>
          </div>
        </div>
      </Modal>

      {/* OVERLAY 2: DRAWER */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRow(null);
        }}
        title="Audit Log Entry Inspector"
      >
        {selectedRow ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Event Name</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedRow.event}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Operator Role</span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg font-mono">
                  {selectedRow.operator}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">Status Code</span>
                <StatusBadge status={selectedRow.status} />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Timestamp (ISO)</span>
              <p className="text-xs text-slate-650 dark:text-slate-355 font-semibold">{selectedRow.timestamp}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Technical Notes</span>
              <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed">{selectedRow.notes}</p>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-10">No log item selected.</p>
        )}
      </Drawer>

      {/* OVERLAY 3: CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handlePurgeConfirm}
        loading={confirmLoading}
        title="Purge Audit Cache?"
        description="Are you absolutely sure you want to flush all system logs? This operation simulates a high-priority, double-confirmation administrative workflow action."
        confirmLabel="Confirm Purge"
        cancelLabel="Discard"
        type="danger"
      />
    </div>
  );
}
