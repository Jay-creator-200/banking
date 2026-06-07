'use client';

import React from 'react';
import { FileQuestion } from 'lucide-react';

/**
 * Clean, modern empty state card for lists, tables, and search views with zero records.
 *
 * @param {Object} props
 * @param {string} [props.title='No records found']
 * @param {string} [props.description]
 * @param {React.ComponentType} [props.icon] - Reusable icon component (e.g. from lucide-react).
 * @param {React.ReactNode} [props.actionButton] - Optional action triggers (e.g. Create Button).
 * @param {string} [props.className='']
 */
export function EmptyState({
  title = 'No records found',
  description = 'There are no active entries matching your criteria in the system at this time.',
  icon: Icon = FileQuestion,
  actionButton = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80 ${className}`}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 mb-4 ring-4 ring-slate-50 dark:ring-slate-900/30">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs md:max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {actionButton && <div className="flex justify-center">{actionButton}</div>}
    </div>
  );
}

export default EmptyState;
