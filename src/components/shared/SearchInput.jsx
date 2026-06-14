'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Reusable, clean search field with magnifying glass prefix and clear suffix actions.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {function(React.ChangeEvent<HTMLInputElement>): void} props.onChange
 * @param {string} [props.placeholder='Search database records...']
 * @param {function(): void} [props.onClear] - Clear input callback.
 * @param {string} [props.className='']
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search database records...',
  onClear,
  className = '',
  ...props
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all duration-200"
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-150"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
