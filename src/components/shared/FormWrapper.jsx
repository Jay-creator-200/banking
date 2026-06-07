'use client';

import React from 'react';

/**
 * Standard form utility wrapper that handles submit events, loader overlays, error bounds, and cancel actions.
 *
 * @param {Object} props
 * @param {function(React.FormEvent): void} props.onSubmit - Action submit handler.
 * @param {React.ReactNode} props.children - Form inputs.
 * @param {string|null} [props.error=null] - Generic error display prompt.
 * @param {string} [props.submitLabel='Save Changes']
 * @param {string} [props.cancelLabel='Cancel']
 * @param {function(): void} [props.onCancel] - Cancel callback if cancellation is possible.
 * @param {boolean} [props.loading=false] - Disable inputs and display submit spinner.
 * @param {string} [props.className='']
 */
export function FormWrapper({
  onSubmit,
  children,
  error = null,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  onCancel,
  loading = false,
  className = '',
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${className}`}>
      {/* Alert boundary for global API or schema validation errors */}
      {error && (
        <div className="p-4 rounded-xl text-sm font-medium bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 transition-all duration-300">
          {error}
        </div>
      )}

      <div className="space-y-4">{children}</div>

      {/* standard button operations layout */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-650 text-white disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2 min-w-[90px]"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin rounded-full shrink-0" />
          )}
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
}

export default FormWrapper;
