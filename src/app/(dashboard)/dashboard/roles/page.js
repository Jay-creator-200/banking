'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Save, CheckSquare, Square, RefreshCw, Plus } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [mappedPermissions, setMappedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Create Role states
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', code: '', description: '' });
  const [roleErrors, setRoleErrors] = useState({});

  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setMappedPermissions([]);
    
    if (role.code === 'SUPER_ADMIN') {
      // Super admin has all permissions implicitly
      const allIds = permissions.map(p => p._id);
      setMappedPermissions(allIds);
      return;
    }

    try {
      const res = await fetch(`/api/role-permissions?roleId=${role._id}`);
      if (res.ok) {
        const json = await res.json();
        // Extract permissionIds
        const ids = json.data ? json.data.map(m => m.permissionId?._id || m.permissionId) : [];
        setMappedPermissions(ids);
      }
    } catch (e) {
      console.error('Failed to load role mappings:', e);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/permissions'),
      ]);
      
      let fetchedRoles = [];
      if (rolesRes.ok) {
        const json = await rolesRes.json();
        fetchedRoles = json.data || [];
        setRoles(fetchedRoles);
      }
      
      if (permRes.ok) {
        const json = await permRes.json();
        setPermissions(json.data || []);
      }

      // Automatically select the first non-SUPER_ADMIN role if available
      if (fetchedRoles.length > 0) {
        const defaultRole = fetchedRoles.find(r => r.code !== 'SUPER_ADMIN') || fetchedRoles[0];
        // Note: we can't directly call handleSelectRole here if it depends on permissions,
        // but permissions state is set asynchronously. However, in handleSelectRole, if SUPER_ADMIN,
        // it maps permissions. Let's do it inline or handle cleanly.
        setSelectedRole(defaultRole);
        if (defaultRole.code === 'SUPER_ADMIN') {
          // If SUPER_ADMIN, map all permission IDs from current response
          const permJson = permRes.ok ? await permRes.clone().json() : { data: [] };
          const allIds = (permJson.data || []).map(p => p._id);
          setMappedPermissions(allIds);
        } else {
          const res = await fetch(`/api/role-permissions?roleId=${defaultRole._id}`);
          if (res.ok) {
            const json = await res.json();
            const ids = json.data ? json.data.map(m => m.permissionId?._id || m.permissionId) : [];
            setMappedPermissions(ids);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load roles data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePermissionToggle = (permId) => {
    if (!selectedRole || selectedRole.code === 'SUPER_ADMIN') return;
    
    if (mappedPermissions.includes(permId)) {
      setMappedPermissions(mappedPermissions.filter(id => id !== permId));
    } else {
      setMappedPermissions([...mappedPermissions, permId]);
    }
  };

  const handleSaveMappings = async (e) => {
    e.preventDefault();
    if (!selectedRole || selectedRole.code === 'SUPER_ADMIN') return;

    setSaveLoading(true);
    try {
      const res = await fetch('/api/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRole._id,
          permissionIds: mappedPermissions,
        }),
      });

      if (res.ok) {
        alert(`Successfully synchronized access policies for ${selectedRole.name}.`);
      } else {
        const json = await res.json();
        alert(`Failed to save mappings: ${json.error?.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setRoleErrors({});

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'VALIDATION_ERROR' && json.error.details) {
          setRoleErrors(json.error.details);
        } else {
          alert(json.error?.message || 'Failed to create role');
        }
        return;
      }

      setCreateOpen(false);
      setNewRole({ name: '', code: '', description: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Group permissions by module category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const mod = perm.module || 'general';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role & Policy Management"
        subtitle="Manage access roles and assign module-level security permissions."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Access Policies', href: '#' },
        ]}
        action={
          <button
            onClick={() => setCreateOpen(!createOpen)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        }
      />

      {/* Create Role Form card overlay */}
      {createOpen && (
        <CardWrapper title="New Security Role" subtitle="Create role tags before mapping permission constraints.">
          <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Role Name
              </label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                placeholder="Loan Officer"
                required
              />
              {roleErrors.name && <p className="text-xs text-rose-600 mt-1">{roleErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Unique Role Code
              </label>
              <input
                type="text"
                value={newRole.code}
                onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                placeholder="LOAN_OFFICER"
                required
              />
              {roleErrors.code && <p className="text-xs text-rose-600 mt-1">{roleErrors.code}</p>}
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  placeholder="Handles loan approvals"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-9.5 shrink-0 cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </CardWrapper>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles Selector list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            System Roles
          </h3>
          <div className="space-y-1.5">
            {roles.map((role) => {
              const isSelected = selectedRole?._id === role._id;
              return (
                <button
                  key={role._id}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <p>{role.name}</p>
                    <p className={`text-[9px] mt-0.5 font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {role.code}
                    </p>
                  </div>
                  <Shield className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions checkbox mapper */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <CardWrapper
              title={`Access Policies: ${selectedRole.name}`}
              subtitle={selectedRole.description || 'Set granular user privileges.'}
              action={
                selectedRole.code !== 'SUPER_ADMIN' && (
                  <button
                    onClick={handleSaveMappings}
                    disabled={saveLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saveLoading ? 'Saving...' : 'Save Mappings'}
                  </button>
                )
              }
            >
              {selectedRole.code === 'SUPER_ADMIN' && (
                <div className="mb-6 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/15 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 text-xs font-semibold leading-relaxed">
                  SUPER_ADMIN contains complete system-wide override access. Privileges are read-only and automatically mapped to all permissions.
                </div>
              )}

              <div className="space-y-6">
                {Object.keys(groupedPermissions).map((moduleName) => (
                  <div key={moduleName} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                      {moduleName} Module
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupedPermissions[moduleName].map((perm) => {
                        const isChecked = mappedPermissions.includes(perm._id);
                        const isDisabled = selectedRole.code === 'SUPER_ADMIN';

                        return (
                          <div
                            key={perm._id}
                            onClick={() => !isDisabled && handlePermissionToggle(perm._id)}
                            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                              isDisabled ? 'opacity-85' : 'cursor-pointer'
                            } ${
                              isChecked
                                ? 'bg-indigo-50/10 border-indigo-250 dark:bg-indigo-950/5 dark:border-indigo-900/40'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            <span className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-450">
                              {isChecked ? (
                                <CheckSquare className="w-4.5 h-4.5" />
                              ) : (
                                <Square className="w-4.5 h-4.5" />
                              )}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {perm.name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                {perm.description || 'No description provided.'}
                              </p>
                              <p className="text-[9px] font-mono text-slate-400 mt-1 block">
                                Code: {perm.code}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardWrapper>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-center">
              <Shield className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No role selected</p>
              <p className="text-xs text-slate-400 mt-1">Please select a role from the left list to review its permissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
