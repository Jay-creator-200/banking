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
  FolderOpen
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
  
  // Real stats state
  const [stats, setStats] = useState({ users: 0, branches: 0, auditLogs: 0, loginLogs: 0 });
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

  // Fetch Database Counts
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Admin Control Center" 
        subtitle="Manage employees, branches, access policies, and audit ledgers."
        breadcrumbs={[
          { label: 'Platform Core', href: '#' },
          { label: 'Overview', href: '/dashboard' }
        ]}
        action={
          <button 
            onClick={() => {
              setStatsLoading(true);
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Overview
          </button>
        }
      />

      {/* Integration Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/users" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Users</p>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {statsLoading ? '...' : stats.users} Employees
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">DB Connected</span>
                </div>
              </div>
            </div>
          </CardWrapper>
        </Link>

        <Link href="/dashboard/branches" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Branches</p>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {statsLoading ? '...' : stats.branches} Offices
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Head Office Bound</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        <Link href="/dashboard/audit" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audit History</p>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {statsLoading ? '...' : stats.auditLogs} Records
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Delta mutation logging</span>
              </div>
            </div>
          </CardWrapper>
        </Link>

        <Link href="/dashboard/login-logs" className="transition-transform hover:scale-[1.01] duration-200 cursor-pointer block">
          <CardWrapper className="h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access History</p>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {statsLoading ? '...' : stats.loginLogs} Attempts
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Security login log files</span>
              </div>
            </div>
          </CardWrapper>
        </Link>
      </div>

      {/* Main Tabbed Showcase Layout */}
      <div className="border border-slate-200/90 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
          <button
            onClick={() => setActiveTab('components')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'components'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            UI Components & Data Table
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'validation'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Zod Form Validation
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
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
              <p className="text-xs text-slate-650 dark:text-slate-350 font-semibold">{selectedRow.timestamp}</p>
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
