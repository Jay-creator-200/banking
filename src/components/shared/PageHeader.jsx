'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Page Header layout component that formats titles, descriptions, breadcrumbs, and optional primary actions.
 *
 * @param {Object} props
 * @param {string} props.title - Main header title.
 * @param {string} [props.subtitle] - Explanatory subtitle.
 * @param {Array<{ label: string, href?: string }>} [props.breadcrumbs=[]] - Path trail items.
 * @param {React.ReactNode} [props.action=null] - Action buttons (e.g. New Entry, Export).
 * @param {string} [props.className='']
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  action = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/60 mb-6 ${className}`}
    >
      <div>
        {/* Navigation Breadcrumb Trail */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={`crumb-${idx}`}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                  {isLast || !crumb.href ? (
                    <span className="font-semibold text-slate-700 dark:text-slate-350">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          {action}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
