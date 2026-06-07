'use client';

import React from 'react';

/**
 * Customizable, modern loading spinner designed for banking layout panels and async wait screens.
 *
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Dimensions size parameter.
 * @param {string} [props.className=''] - Custom wrapper tailwind classes.
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  const spinnerSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center justify-center p-4 ${className}`} role="status">
      <div
        className={`animate-spin rounded-full border-solid border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-500 ${spinnerSize}`}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default LoadingSpinner;
