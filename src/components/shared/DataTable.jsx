'use client';

import React from 'react';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * Reusable, responsive, premium banking data-table component.
 * Supports custom column schemas, cell render functions, loading spinners, and custom empty lists.
 *
 * @param {Object} props
 * @param {Array<{ header: string, accessor?: string, cell?: function({ row: Object, value: any, index: number }): React.ReactNode, className?: string, headerClassName?: string, width?: string|number }>} props.columns
 * @param {Array<Object>} props.data - Row items list.
 * @param {boolean} [props.loading=false]
 * @param {React.ReactNode} [props.emptyState=null] - Overrides default empty state card.
 * @param {string|function(Object): string} [props.rowKey='_id'] - Key field descriptor.
 * @param {function(Object): void} [props.onRowClick=null] - Action row click callback.
 * @param {string} [props.className='']
 */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyState = null,
  rowKey = '_id',
  onRowClick = null,
  className = '',
}) {
  return (
    <div
      className={`w-full overflow-hidden border border-slate-200/90 dark:border-slate-800/80 rounded-t-2xl bg-white dark:bg-slate-950 ${className}`}
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
              {columns.map((col, idx) => (
                <th
                  key={`col-header-${col.header || idx}`}
                  className={`px-6 py-4 font-bold ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-350">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16">
                  <LoadingSpinner size="lg" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState || (
                    <EmptyState className="rounded-none border-none bg-transparent py-16" />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const keyVal = typeof rowKey === 'function' ? rowKey(row) : row[rowKey] || rowIdx;
                return (
                  <tr
                    key={`row-${keyVal}`}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/15 transition-all duration-150 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const cellVal = col.accessor ? row[col.accessor] : undefined;
                      return (
                        <td
                          key={`row-cell-${col.header || colIdx}`}
                          className={`px-6 py-4 align-middle whitespace-nowrap ${col.className || ''}`}
                        >
                          {col.cell ? col.cell({ row, value: cellVal, index: rowIdx }) : cellVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
