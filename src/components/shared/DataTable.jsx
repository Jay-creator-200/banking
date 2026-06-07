'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * Enhanced, responsive, premium banking data-table component.
 * Supports custom column schemas, sorting headers, bulk checkboxes selection, loading spinners, and custom empty lists.
 *
 * @param {Object} props
 * @param {Array<{ header: string, accessor?: string, sortable?: boolean, cell?: function({ row: Object, value: any, index: number }): React.ReactNode, className?: string, headerClassName?: string, width?: string|number }>} props.columns
 * @param {Array<Object>} props.data - Row items list.
 * @param {boolean} [props.loading=false]
 * @param {React.ReactNode} [props.emptyState=null] - Overrides default empty state card.
 * @param {string|function(Object): string} [props.rowKey='_id'] - Key field descriptor.
 * @param {function(Object): void} [props.onRowClick=null] - Action row click callback.
 * 
 * // Sorting Props
 * @param {string} [props.sortField='']
 * @param {'asc'|'desc'} [props.sortOrder='desc']
 * @param {function(string, 'asc'|'desc'): void} [props.onSortChange=null]
 * 
 * // Selection (Bulk Actions) Props
 * @param {boolean} [props.selectable=false]
 * @param {Array<string>} [props.selectedIds=[]]
 * @param {function(Array<string>): void} [props.onSelectionChange=null]
 * 
 * @param {string} [props.className='']
 */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyState = null,
  rowKey = '_id',
  onRowClick = null,
  sortField = '',
  sortOrder = 'desc',
  onSortChange = null,
  selectable = false,
  selectedIds = [],
  onSelectionChange = null,
  className = '',
}) {
  const getRowId = (row, idx) => {
    return typeof rowKey === 'function' ? rowKey(row) : row[rowKey] || String(idx);
  };

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      const allIds = data.map((row, idx) => getRowId(row, idx));
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (e, rowId) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange([...selectedIds, rowId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== rowId));
    }
  };

  const handleSortClick = (col) => {
    if (!col.sortable || !col.accessor || !onSortChange) return;
    const isCurrent = sortField === col.accessor;
    const nextOrder = isCurrent && sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(col.accessor, nextOrder);
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div
      className={`w-full overflow-hidden border border-slate-200/90 dark:border-slate-800/80 rounded-t-2xl bg-white dark:bg-slate-950 ${className}`}
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
              {/* Checkbox column for bulk operations */}
              {selectable && (
                <th className="px-6 py-4 w-12 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col, idx) => {
                const isSorted = sortField === col.accessor;
                const canSort = col.sortable && col.accessor;

                return (
                  <th
                    key={`col-header-${col.header || idx}`}
                    onClick={() => canSort && handleSortClick(col)}
                    className={`px-6 py-4 font-bold ${col.headerClassName || ''} ${
                      canSort ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-850/40 select-none' : ''
                    }`}
                    style={{ width: col.width }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {canSort && (
                        <span className="shrink-0 text-slate-400">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 hover:text-slate-650" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-350">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16">
                  <LoadingSpinner size="lg" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                  {emptyState || (
                    <EmptyState className="rounded-none border-none bg-transparent py-16" />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const rowId = getRowId(row, rowIdx);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <tr
                    key={`row-${rowId}`}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/15 transition-all duration-150 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${isSelected ? 'bg-indigo-50/15 dark:bg-indigo-950/10' : ''}`}
                  >
                    {/* Row Checkbox */}
                    {selectable && (
                      <td className="px-6 py-4 text-center align-middle w-12" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(e, rowId)}
                          className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}

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
