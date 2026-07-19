'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : 'N/A';

export default function JoiningLetterPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${id}`).then((res) => res.json()),
      fetch('/api/receipts/settings').then((res) => res.json()),
    ])
      .then(([userJson, settingsJson]) => {
        if (!userJson.success) throw new Error(userJson.error?.message || 'Failed to load staff record');
        setUser(userJson.data);
        setSettings(settingsJson.data || {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-sm text-rose-600">{error}</div>;

  const branch = user.branchId || {};

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="max-w-[850px] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard/users" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Users</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"><Printer className="w-4 h-4" /> Print Letter</button>
      </div>

      <div className="max-w-[850px] mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm print:shadow-none p-12">
        <div className="text-center border-b border-slate-300 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {settings?.showLogo && settings.logoUrl && <img src={settings.logoUrl} alt="" className="h-14 mx-auto mb-2 object-contain" />}
          <h1 className="text-xl font-black uppercase">{settings?.institutionName || 'Noble Cooperative Society'}</h1>
          <p className="text-xs mt-1 whitespace-pre-wrap">{settings?.institutionAddress || [branch.address, branch.city, branch.state].filter(Boolean).join(', ')}</p>
          <p className="text-xs">{settings?.contactLine || branch.contactNumber || ''}</p>
        </div>

        <div className="mt-8 text-sm leading-7">
          <div className="flex justify-between text-xs mb-8">
            <span>Ref: JOIN-{user.employeeCode}</span>
            <span>Date: {date(new Date())}</span>
          </div>

          <h2 className="text-center text-lg font-black uppercase underline mb-8">Joining Letter</h2>

          <p>To,</p>
          <p className="font-bold">{user.fullName}</p>
          <p>Employee Code: {user.employeeCode}</p>

          <p className="mt-6">Dear {user.fullName},</p>

          <p className="mt-4">
            This is to confirm that you have joined {settings?.institutionName || 'the society'} as
            {' '}<b>{user.designation || user.roleId?.name || 'Staff'}</b>
            {' '}in the <b>{user.department || 'Operations'}</b> department at
            {' '}<b>{branch.branchName || 'assigned branch'}</b> with effect from
            {' '}<b>{date(user.joiningDate || user.createdAt)}</b>.
          </p>

          <p className="mt-4">
            Your employment type is <b>{user.employmentType || 'permanent'}</b>. Your monthly salary recorded in the system is
            {' '}<b>Rs. {Number(user.monthlySalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>,
            subject to attendance, deductions, society policies, and statutory compliance.
          </p>

          <p className="mt-4">
            You are requested to follow all operational, confidentiality, member-service, and cash-handling rules of the society.
            This letter is generated from the banking software employee records.
          </p>

          <div className="mt-20 flex justify-between text-xs font-bold">
            <span>Employee Signature</span>
            <span>{settings?.authorizedSignatoryLabel || 'Authorized Signatory'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
