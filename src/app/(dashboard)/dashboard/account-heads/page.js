'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import Drawer from '@/components/shared/Drawer.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';

export default function AccountHeadsPage() {
  const [tree, setTree] = useState([]);
  const [flatHeads, setFlatHeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expanded nodes tracker (key = ID, value = boolean)
  const [expanded, setExpanded] = useState({});

  // Drawer / Form States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'ASSET',
    parentAccountId: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formGlobalError, setFormGlobalError] = useState(null);

  // Delete Confirm Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Fetch Chart of Accounts Tree
  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account-heads');
      if (res.ok) {
        const json = await res.json();
        setTree(json.data);

        // Build flat list of account heads for parent selection options
        const flatList = [];
        const traverse = (nodes) => {
          nodes.forEach((node) => {
            flatList.push({ _id: node._id, name: node.name, code: node.code, type: node.type });
            if (node.children && node.children.length > 0) traverse(node.children);
          });
        };
        traverse(json.data);
        setFlatHeads(flatList);
      }
    } catch (err) {
      console.error('Failed to load chart of accounts tree:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Toggle node expansion
  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setIsEdit(false);
    setCurrentId(null);
    setFormData({
      name: '',
      code: '',
      type: 'ASSET',
      parentAccountId: '',
    });
    setFormErrors({});
    setFormGlobalError(null);
    setDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = async (node) => {
    setIsEdit(true);
    setCurrentId(node._id);
    setFormData({
      name: node.name,
      code: node.code,
      type: node.type,
      parentAccountId: node.parentAccountId || '',
    });
    setFormErrors({});
    setFormGlobalError(null);
    setDrawerOpen(true);
  };

  // Submit Form
  const handleSubmit = async () => {
    setFormLoading(true);
    setFormGlobalError(null);
    setFormErrors({});

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Account name is required';
    if (!formData.code.trim()) errors.code = 'Account code is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormLoading(false);
      return;
    }

    try {
      const url = isEdit ? `/api/account-heads/${currentId}` : '/api/account-heads';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        name: formData.name,
        parentAccountId: formData.parentAccountId || null,
      };

      if (!isEdit) {
        payload.code = formData.code;
        payload.type = formData.type;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.errors) {
          setFormErrors(json.errors);
        } else {
          setFormGlobalError(json.message || 'Operation failed.');
        }
      } else {
        setDrawerOpen(false);
        fetchTree();
      }
    } catch (err) {
      setFormGlobalError('Network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  // Trigger Delete
  const handleDeleteTrigger = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    try {
      const res = await fetch(`/api/account-heads/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteOpen(false);
        fetchTree();
      } else {
        const json = await res.json();
        alert(json.message || 'Failed to delete account head');
      }
    } catch (err) {
      alert('Network communication error.');
    }
  };

  // Recursive Tree Node Renderer
  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node._id];

    return (
      <div key={node._id} className="select-none">
        <div
          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/60 transition group text-xs border border-transparent hover:border-slate-100 dark:hover:border-slate-800/40"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          <div className="flex items-center gap-2.5">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node._id)}
                className="w-4.5 h-4.5 flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4.5 h-4.5" />
            )}

            {hasChildren ? (
              <Folder className="w-4 h-4 text-indigo-500 fill-indigo-500/10 shrink-0" />
            ) : (
              <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
            )}

            <div>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 mr-2">
                [{node.code}]
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-350">
                {node.name}
              </span>
              <span className="ml-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {node.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleOpenEdit(node)}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-950 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded shadow-sm cursor-pointer transition"
              title="Edit Head"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDeleteTrigger(node._id)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-950 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded shadow-sm cursor-pointer transition"
              title="Delete Head"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Hierarchy structure for assets, liabilities, equities, income, and expenses"
      >
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          Add Account Head
        </button>
      </PageHeader>

      <CardWrapper className="p-6">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-350">Chart of Accounts is empty</h4>
            <p className="text-xs">Seed Phase 2 default values or add account heads manually.</p>
          </div>
        ) : (
          <div className="space-y-1 max-w-4xl">
            <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4 px-3">
              <span>Account Head hierarchy</span>
              <span>Actions</span>
            </div>
            {tree.map((root) => renderNode(root, 0))}
          </div>
        )}
      </CardWrapper>

      {/* CRUD Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={isEdit ? 'Edit Account Head' : 'Add Account Head'}
      >
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Save Changes' : 'Create Account Head'}
          loading={formLoading}
          error={formGlobalError}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Account Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. 11001"
                disabled={isEdit}
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 focus:outline-none ${
                  isEdit ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400' : (formErrors.code ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800')
                }`}
                required
              />
              {formErrors.code && <p className="text-xs text-rose-500 mt-1">{formErrors.code}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Account Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Cash in hand"
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-950 focus:outline-none ${
                  formErrors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                required
              />
              {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Account Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={isEdit}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Parent Account Head (Optional)
              </label>
              <select
                value={formData.parentAccountId}
                onChange={(e) => setFormData({ ...formData, parentAccountId: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value="">No Parent (Root Node)</option>
                {flatHeads
                  .filter((h) => h._id !== currentId) // prevent self-parenting
                  .map((h) => (
                    <option key={h._id} value={h._id}>
                      [{h.code}] {h.name} ({h.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </FormWrapper>
      </Drawer>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteSubmit}
        title="Confirm Soft Delete"
        confirmText="Yes, Delete"
        type="danger"
      >
        <p className="text-xs text-slate-500">
          Are you sure you want to delete this Account Head? Transactions posted to this head will not be affected,
          but new postings to this head will be blocked.
        </p>
      </ConfirmDialog>
    </div>
  );
}
