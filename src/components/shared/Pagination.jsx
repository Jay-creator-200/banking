'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination navigation component.
 *
 * @param {Object} props
 * @param {number} [props.currentPage=1] - Current active page number.
 * @param {number} [props.totalPages=1] - Total page count.
 * @param {function(number): void} props.onPageChange - Click callback with new page index.
 * @param {string} [props.className='']
 */
export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const handlePrev = () => onPageChange(Math.max(currentPage - 1, 1));
  const handleNext = () => onPageChange(Math.min(currentPage + 1, totalPages));

  // Generates page numbers with ellipsis where needed
  const getPages = () => {
    const pages = [];
    const maxVisible = 2; // Left and right of current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - maxVisible && i <= currentPage + maxVisible)
      ) {
        pages.push(i);
      } else if (
        pages[pages.length - 1] !== '...'
      ) {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 sm:px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 rounded-b-2xl ${className}`}
    >
      {/* Mobile-only View */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Next
        </button>
      </div>

      {/* Desktop/Tablet View */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing Page <span className="font-semibold text-slate-900 dark:text-slate-100">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm bg-slate-50 dark:bg-slate-900/40 p-0.5 border border-slate-100 dark:border-slate-800" aria-label="Pagination">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPages().map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 select-none"
                  >
                    ...
                  </span>
                );
              }

              const isActive = currentPage === page;

              return (
                <button
                  key={`page-${page}`}
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
