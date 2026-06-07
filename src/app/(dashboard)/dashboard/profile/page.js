'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { User, Key, Mail, Phone, Shield, Building, Contact } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const user = session?.user;

  const handlePasswordChange = async (e) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update password');
      }

      setSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650" />
      </div>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal details and authentication parameters."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Profile', href: '#' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="lg:col-span-1 space-y-6">
          <CardWrapper className="text-center py-8">
            <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-bold text-2xl mx-auto border border-indigo-200/20 uppercase shadow-sm">
              {initials}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 leading-snug">
              {user.fullName}
            </h3>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
              {user.roleCode?.replace(/_/g, ' ') || 'EMPLOYEE'}
            </p>

            <div className="mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-6 text-left px-2 space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block">Email Address</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Contact className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block">Employee ID</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">{user.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 font-semibold block">Assigned Branch</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {user.branchName} ({user.branchCode})
                  </span>
                </div>
              </div>
            </div>
          </CardWrapper>
        </div>

        {/* Password Update Forms */}
        <div className="lg:col-span-2">
          <CardWrapper title="Security Override" subtitle="Update terminal credentials. Must comply with password complexity rules.">
            {success && (
              <div className="mb-4 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-sm font-semibold">
                Your password was updated successfully in the core registry.
              </div>
            )}

            <FormWrapper
              onSubmit={handlePasswordChange}
              submitLabel="Rotate Password"
              loading={loading}
              error={error}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmNewPassword}
                    onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </FormWrapper>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
