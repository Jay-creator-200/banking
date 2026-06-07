'use client';

import React from 'react';

/**
 * Authentication split screen layout.
 * Features a graphical branding panel on desktop screens and a card layout.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-200">
      {/* Branding graphic panel (Visible on Desktop / lg) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Soft atmospheric gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(79,70,229,0.1),transparent_40%)]" />

        {/* Top Logo */}
        <div className="flex items-center gap-3 relative z-10 select-none">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/20">
            N
          </div>
          <span className="font-bold text-white text-lg tracking-wide">
            Noble Cooperative Bank
          </span>
        </div>

        {/* Central Core Pitch */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Empowering Cooperative Growth, Securing Community Wealth.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            An enterprise-grade Core Cooperative Banking platform designed with robust multi-branch capabilities, double-entry ledgers, and transaction routing.
          </p>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 text-[10px] text-slate-500 font-bold tracking-wider uppercase">
          Noble Banking Solutions • Core System Platform
        </div>
      </div>

      {/* Inputs card layout (centered) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800/80 shadow-xl rounded-2xl p-8 sm:p-10 transition-all animate-in fade-in zoom-in-95 duration-300">
          {/* Logo indicator shown only on mobile screen widths */}
          <div className="flex flex-col items-center justify-center lg:hidden mb-8 text-center select-none animate-in slide-in-from-top duration-300">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-sm">
              N
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Noble Cooperative Bank
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">
              Core Core Banking Solution
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
