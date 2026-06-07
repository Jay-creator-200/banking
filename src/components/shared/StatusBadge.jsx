'use client';

import React from 'react';

const statusStyles = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
  CLOSED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
  SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
  DRAFT: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40',
};

/**
 * Premium, HSL-colored status indicator tag with micro-bullet.
 *
 * @param {Object} props
 * @param {string} props.status - The current state key.
 */
export function StatusBadge({ status }) {
  const key = String(status || '').toUpperCase().trim();
  const currentStyle = statusStyles[key] || 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold tracking-wide rounded-full border select-none transition-all duration-300 ${currentStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-85 shrink-0" />
      <span className="capitalize">{key.replace(/_/g, ' ').toLowerCase()}</span>
    </span>
  );
}

export default StatusBadge;
