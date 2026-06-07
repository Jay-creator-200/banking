'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  X,
  Check,
  Building2
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import Pagination from '@/components/shared/Pagination.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import SearchInput from '@/components/shared/SearchInput.jsx';
import { exportToCSV } from '@/utils/csv-exporter.js';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Drawer / Form States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
    email: '',
    status: 'ACTIVE',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formGlobalError, setFormGlobalError] = useState(null);

  // Selection & Bulk Action States
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Dialog Overlays States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [branchIdToDelete, setBranchIdToDelete] = useState(null);

  // Fetch Branches List
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/branches?page=${page}&limit=${limit}&search=${encodeURIComponent(
        search
      )}&sortField=${sortField}&sortOrder=${sortOrder}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setBranches(json.data || []);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch branches:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortField, sortOrder]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleSortChange = (field, order) => {
    setSortField(field);
    setSortOrder(order);
  };

  // Add / Edit submission
  const handleSubmit = async (e) => {
    setFormLoading(true);
    setFormErrors({});
    setFormGlobalError(null);

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/branches/${currentId}` : '/api/branches';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'VALIDATION_ERROR' && json.error.details) {
          setFormErrors(json.error.details);
        } else {
          setFormGlobalError(json.error?.message || 'Failed to save branch record');
        }
        return;
      }

      setDrawerOpen(false);
      fetchBranches();
    } catch (err) {
      setFormGlobalError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setIsEdit(false);
    setCurrentId(null);
    setFormData({
      branchCode: '',
      branchName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactNumber: '',
      email: '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setFormGlobalError(null);
    setDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (branch) => {
    setIsEdit(true);
    setCurrentId(branch._id);
    setFormData({
      branchCode: branch.branchCode || '',
      branchName: branch.branchName || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      contactNumber: branch.contactNumber || '',
      email: branch.email || '',
      status: branch.status || 'ACTIVE',
    });
    setFormErrors({});
    setFormGlobalError(null);
    setDrawerOpen(true);
  };

  // Delete execution
  const handleDeleteTrigger = (id) => {
    setBranchIdToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/branches/${branchIdToDelete}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Failed to delete branch');
      } else {
        setDeleteConfirmOpen(false);
        fetchBranches();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk Actions
  const handleBulkDeactivate = async () => {
    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/branches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'INACTIVE' }),
          })
        )
      );
      setSelectedIds([]);
      fetchBranches();
    } catch (e) {
      console.error(e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm('Are you sure you want to delete the selected branches? Head Office (HO) cannot be deleted.')) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => fetch(`/api/branches/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchBranches();
    } catch (e) {
      console.error(e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export to CSV helper
  const handleExport = () => {
    const cols = [
      { header: 'Branch Code', accessor: 'branchCode' },
      { header: 'Branch Name', accessor: 'branchName' },
      { header: 'Email', accessor: 'email' },
      { header: 'Contact Number', accessor: 'contactNumber' },
      { header: 'Address', accessor: 'address' },
      { header: 'City', accessor: 'city' },
      { header: 'State', accessor: 'state' },
      { header: 'Pincode', accessor: 'pincode' },
      { header: 'Status', accessor: 'status' },
    ];
    exportToCSV(branches, cols, 'Apex-Branches-Export.csv');
  };

  const columns = [
    {
      header: 'Branch Code',
      accessor: 'branchCode',
      sortable: true,
      cell: ({ value }) => (
        <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
          {value}
        </span>
      ),
    },
    {
      header: 'Branch Name',
      accessor: 'branchName',
      sortable: true,
      cell: ({ value, row }) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{row.email || 'No Email'}</p>
        </div>
      ),
    },
    {
      header: 'Contact Number',
      accessor: 'contactNumber',
      cell: ({ value }) => <span className="text-xs font-medium text-slate-750 dark:text-slate-350">{value || 'N/A'}</span>,
    },
    {
      header: 'Location',
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.city || 'N/A'}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{row.state || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: ({ value }) => <StatusBadge status={value} />,
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const isHO = row.branchCode === 'HO';
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Edit Branch"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            {!isHO && (
              <button
                onClick={() => handleDeleteTrigger(row._id)}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Delete Branch"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Management"
        subtitle="Manage branches, head office details, regional addresses, and contact channels."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Branches', href: '#' },
        ]}
        action = {
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm text-slate-700 dark:text-slate-350"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          </div>
        }
      />

      {/* Bulk Action Bar if items selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-indigo-50/45 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <Check className="w-4.5 h-4.5" />
            <span>Selected {selectedIds.length} branches</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDeactivate}
              disabled={bulkActionLoading}
              className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer disabled:opacity-40"
            >
              Deactivate Selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer disabled:opacity-40"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="border border-slate-200/90 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Branch Registry</h3>
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search code, name, city..."
          />
        </div>

        <DataTable
          columns={columns}
          data={branches}
          loading={loading}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Creation / Update Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={isEdit ? 'Edit Branch Details' : 'Register New Branch'}
      >
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Save Changes' : 'Register Branch'}
          loading={formLoading}
          error={formGlobalError}
          onCancel={() => setDrawerOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Branch Code
                </label>
                <input
                  type="text"
                  value={formData.branchCode}
                  onChange={(e) => setFormData({ ...formData, branchCode: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.branchCode ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="MUM01"
                  required
                  disabled={isEdit}
                />
                {formErrors.branchCode && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.branchCode}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.branchName ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="Mumbai Main Branch"
                  required
                />
                {formErrors.branchName && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.branchName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                  formErrors.address ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                }`}
                placeholder="123, Fort Road, Near GT Hospital"
                rows={2}
              />
              {formErrors.address && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.address}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.city ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="Mumbai"
                />
                {formErrors.city && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.city}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.state ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="Maharashtra"
                />
                {formErrors.state && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.state}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.pincode ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="400001"
                />
                {formErrors.pincode && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.pincode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.contactNumber ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="2222610000"
                />
                {formErrors.contactNumber && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.contactNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.email ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="mumbai@apexbank.in"
                />
                {formErrors.email && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Branch Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
        </FormWrapper>
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Soft-Delete Branch?"
        description="Are you absolutely sure you want to soft-delete this branch? Mapped users may lose association immediately."
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        type="danger"
      />
    </div>
  );
}
