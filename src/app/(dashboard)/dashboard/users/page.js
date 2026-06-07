'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  X,
  Check,
  UserPlus
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
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

import { exportToCSV } from '@/utils/csv-exporter.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
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
    fullName: '',
    email: '',
    mobile: '',
    username: '',
    employeeCode: '',
    password: '',
    roleId: '',
    branchId: '',
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
  const [userIdToDelete, setUserIdToDelete] = useState(null);

  // Load Initial Options (Roles, Branches)
  const loadOptions = useCallback(async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/branches?limit=100'),
      ]);
      if (rolesRes.ok) {
        const json = await rolesRes.json();
        setRoles(json.data);
      }
      if (branchesRes.ok) {
        const json = await branchesRes.json();
        setBranches(json.data);
      }
    } catch (e) {
      console.error('Failed to load options:', e);
    }
  }, []);

  // Fetch Users List
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/users?page=${page}&limit=${limit}&search=${encodeURIComponent(
        search
      )}&sortField=${sortField}&sortOrder=${sortOrder}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
        setTotalPages(json.meta?.pages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortField, sortOrder]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    const url = isEdit ? `/api/users/${currentId}` : '/api/users';

    // Build payload. For edits, we don't send the password unless filled
    const payload = { ...formData };
    if (isEdit && !payload.password) {
      delete payload.password;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'VALIDATION_ERROR' && json.error.details) {
          setFormErrors(json.error.details);
        } else {
          setFormGlobalError(json.error?.message || 'Failed to save user record');
        }
        return;
      }

      setDrawerOpen(false);
      fetchUsers();
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
      fullName: '',
      email: '',
      mobile: '',
      username: '',
      employeeCode: '',
      password: '',
      roleId: roles[0]?._id || '',
      branchId: branches[0]?._id || '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setFormGlobalError(null);
    setDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (user) => {
    setIsEdit(true);
    setCurrentId(user._id);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      mobile: user.mobile || '',
      username: user.username || '',
      employeeCode: user.employeeCode || '',
      password: '', // Leave blank unless changing
      roleId: user.roleId?._id || user.roleId || '',
      branchId: user.branchId?._id || user.branchId || '',
      status: user.status || 'ACTIVE',
    });
    setFormErrors({});
    setFormGlobalError(null);
    setDrawerOpen(true);
  };

  // Toggle user lock state
  const handleToggleLock = async (user) => {
    const nextStatus = user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete execution
  const handleDeleteTrigger = (id) => {
    setUserIdToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/users/${userIdToDelete}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmOpen(false);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk Actions
  const handleBulkUnlock = async () => {
    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACTIVE' }),
          })
        )
      );
      setSelectedIds([]);
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm('Are you sure you want to soft-delete these selected users?')) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedIds.map((id) => fetch(`/api/users/${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export to CSV helper
  const handleExport = () => {
    const cols = [
      { header: 'Full Name', accessor: 'fullName' },
      { header: 'Username', accessor: 'username' },
      { header: 'Email', accessor: 'email' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Employee Code', accessor: 'employeeCode' },
      { header: 'Role Code', cellValue: (row) => row.roleId?.code || 'None' },
      { header: 'Branch Code', cellValue: (row) => row.branchId?.branchCode || 'None' },
      { header: 'Status', accessor: 'status' },
    ];
    exportToCSV(users, cols, 'Apex-Users-Export.csv');
  };

  const columns = [
    {
      header: 'Employee Details',
      accessor: 'fullName',
      sortable: true,
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">{row.fullName}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Username',
      accessor: 'username',
      sortable: true,
      cell: ({ value }) => <span className="font-semibold text-slate-700 dark:text-slate-350">{value}</span>,
    },
    {
      header: 'Emp Code',
      accessor: 'employeeCode',
      sortable: true,
      cell: ({ value }) => <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">{value}</span>,
    },
    {
      header: 'Role / Branch',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.roleId?.name || 'No Role'}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wide mt-0.5">
            {row.branchId?.branchName || 'No Branch'}
          </p>
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
        const isLocked = row.status === 'LOCKED';
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Edit Profile"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToggleLock(row)}
              className={`p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer ${
                isLocked ? 'text-amber-500 hover:text-amber-600' : 'text-slate-550 hover:text-slate-800'
              }`}
              title={isLocked ? 'Unlock User' : 'Lock User'}
            >
              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleDeleteTrigger(row._id)}
              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete User"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage bank employee profiles, branch mappings, roles assignment, and lock settings."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Employees', href: '#' },
        ]}
        action={
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
              Add Employee
            </button>
          </div>
        }
      />

      {/* Bulk Action Bar if items selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-indigo-50/45 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <Check className="w-4.5 h-4.5" />
            <span>Selected {selectedIds.length} employee accounts</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkUnlock}
              disabled={bulkActionLoading}
              className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer disabled:opacity-40"
            >
              Unlock Selected
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
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Employee List</h3>
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search name, code, email, role..."
          />
        </div>

        <DataTable
          columns={columns}
          data={users}
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
        title={isEdit ? 'Edit Employee Details' : 'Register New Employee'}
      >
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Save Changes' : 'Register User'}
          loading={formLoading}
          error={formGlobalError}
          onCancel={() => setDrawerOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                  formErrors.fullName ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                }`}
                placeholder="John Doe"
                required
              />
              {formErrors.fullName && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.fullName}</p>}
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
                placeholder="john.doe@apexbank.in"
                required
              />
              {formErrors.email && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.mobile ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="9876543210"
                  required
                />
                {formErrors.mobile && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.mobile}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Employee Code
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.employeeCode ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="EMP-0012"
                  required
                />
                {formErrors.employeeCode && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.employeeCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.username ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder="johndoe"
                  required
                  disabled={isEdit}
                />
                {formErrors.username && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.username}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                    formErrors.password ? 'border-rose-350 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-100'
                  }`}
                  placeholder={isEdit ? '•••••••• (Leave blank to keep)' : '••••••••'}
                  required={!isEdit}
                />
                {formErrors.password && <p className="text-xs text-rose-600 mt-1 font-medium">{formErrors.password}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Role Authority
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  required
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Assigned Branch
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  required
                >
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.branchName} ({b.branchCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                required
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="LOCKED">LOCKED</option>
                <option value="DRAFT">DRAFT</option>
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
        title="Soft-Delete Employee?"
        description="Are you absolutely sure you want to deactivate and soft-delete this user account? The user will lose terminal access immediately."
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        type="danger"
      />
    </div>
  );
}
