'use client';

import React from 'react';

/**
 * Standard container wrapper that formats contents in a clean card layout with borders, headers, and footer blocks.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.action=null] - Header action items (e.g. settings cog).
 * @param {React.ReactNode} [props.footer=null] - Footer component block.
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 */
export function CardWrapper({
  title,
  subtitle,
  action = null,
  footer = null,
  children,
  className = '',
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-800/60">
          <div>
            {title && (
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="px-6 py-5">{children}</div>

      {footer && (
        <div className="px-6 py-4 bg-slate-50/40 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
          {footer}
        </div>
      )}
    </div>
  );
}

export default CardWrapper;
