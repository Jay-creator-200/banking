'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import FormWrapper from '@/components/shared/FormWrapper.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import loginSchema from '@/schemas/auth.schema.js';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/dashboard');

  useEffect(() => {
    // Read redirect callback if present
    const cb = searchParams.get('callbackUrl');
    if (cb) setCallbackUrl(cb);

    // Read error query parameter if next-auth returned one
    const err = searchParams.get('error');
    if (err) {
      if (err === 'CredentialsSignin') {
        setError('Invalid username, email, or password.');
      } else {
        setError(err);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    setError(null);
    setLoading(true);

    // Validate using Zod client side first
    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth returns "CredentialsSignin" when authorize() returns null
        if (result.error === 'CredentialsSignin') {
          setError('Invalid username, email, or password.');
        } else {
          setError(result.error);
        }
        setLoading(false);
      } else if (!result?.ok) {
        setError('Login failed. Please try again.');
        setLoading(false);
      } else {
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <CardWrapper
      title="Access Core Terminal"
      subtitle="Provide employee or member credentials to initialize cooperative session"
      className="w-full max-w-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
    >
      <FormWrapper
        onSubmit={handleSubmit}
        submitLabel="Initialize Session"
        loading={loading}
        error={error}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                placeholder="superadmin"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Secure Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>
          </div>
        </div>
      </FormWrapper>

      <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Authorized personnel and portal members only. Actions are bound by audit covenants.
      </div>
    </CardWrapper>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8 bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-sm">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading auth terminal...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
