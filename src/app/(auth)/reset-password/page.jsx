'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import { resetPasswordSchema } from '@/schemas/auth.schema.js';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token') || '';
    setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    setError(null);
    setLoading(true);

    const validation = resetPasswordSchema.safeParse({ password, token });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    // Simulate reset execution success (Phase 1 mock logic)
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1200);
  };

  return (
    <CardWrapper
      title="Reset Terminal Password"
      subtitle="Establish new secure parameters to re-enable log access"
      className="w-full max-w-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
    >
      {success ? (
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Password Overridden</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your password has been successfully updated in the core database.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex justify-center w-full px-4 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sign In with New Password
            </Link>
          </div>
        </div>
      ) : (
        <FormWrapper
          onSubmit={handleSubmit}
          submitLabel="Override Password"
          loading={loading}
          error={error}
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              New Secure Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
              Must contain minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
            </p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8 bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-sm">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading reset params...</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
