'use client';

import React from 'react';
import Modal from './Modal.jsx';
import { AlertOctagon } from 'lucide-react';

/**
 * Premium double-confirmation prompt for high-risk operations (e.g. account closures, overrides).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function(): void} props.onClose
 * @param {function(): void} props.onConfirm
 * @param {string} [props.title='Are you absolutely sure?']
 * @param {string} [props.description]
 * @param {string} [props.confirmLabel='Proceed']
 * @param {string} [props.cancelLabel='Cancel']
 * @param {'danger'|'warning'|'info'} [props.type='danger'] - Styled behavior presets.
 * @param {boolean} [props.loading=false]
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you absolutely sure?',
  description = 'This is a critical operation that cannot be reverted. Please review details before continuing.',
  confirmLabel = 'Proceed',
  cancelLabel = 'Cancel',
  type = 'danger',
  loading = false,
}) {
  const stylesMap = {
    danger: {
      button: 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-750 text-white',
      icon: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 ring-rose-100 dark:ring-rose-950/20',
    },
    warning: {
      button: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-550 dark:hover:bg-amber-650 text-white',
      icon: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 ring-amber-100 dark:ring-amber-950/20',
    },
    info: {
      button: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-650 text-white',
      icon: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-indigo-100 dark:ring-indigo-950/20',
    },
  };

  const activeStyle = stylesMap[type] || stylesMap.info;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        {/* Warning Icon block */}
        <div className={`flex items-center justify-center w-12 h-12 rounded-full ring-4 mb-4 ${activeStyle.icon}`}>
          <AlertOctagon className="w-6 h-6" />
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {description}
        </p>

        {/* Call to Actions buttons */}
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer ${activeStyle.button}`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/25 border-t-white animate-spin rounded-full shrink-0" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
