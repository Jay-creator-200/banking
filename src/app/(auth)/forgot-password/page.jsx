'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import { forgotPasswordSchema } from '@/schemas/auth.schema.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    setError(null);
    setLoading(true);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    // Simulate Reset Request dispatch (Phase 1 mock logic)
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1200);
  };

  return (
    <CardWrapper
      title="Recover Credentials"
      subtitle="Request a system override token to replace forgotten passwords"
      className="w-full max-w-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
    >
      {success ? (
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Reset Link Dispatched</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              If an account is registered to **{email}**, a password reset token will arrive shortly.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/reset-password?token=mock-override-token-${Date.now()}`}
              className="inline-flex justify-center w-full px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Simulate Password Reset Page
            </Link>
          </div>
        </div>
      ) : (
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel="Request Reset Token"
          loading={loading}
          error={error}
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                placeholder="admin@noblebank.coop"
                disabled={loading}
                required
              />
            </div>
          </div>
        </FormWrapper>
      )}

      <div className="mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-4 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to login</span>
        </Link>
      </div>
    </CardWrapper>
  );
}
