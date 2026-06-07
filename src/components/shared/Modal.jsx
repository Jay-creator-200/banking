'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Premium modal overlay dialog component.
 * Features ESC escape key hooks, body scroll lock, size presets, and backdrop-blur panels.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Display condition.
 * @param {function(): void} props.onClose - Dismissal callback.
 * @param {string} props.title - Modal title text.
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Max width preset.
 * @param {React.ReactNode} props.children - Modal inner content.
 * @param {string} [props.className='']
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className = '',
}) {
  // Keypress event listener for Escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizePresets = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const selectedSize = sizePresets[size] || sizePresets.md;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-[3px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card content */}
      <div
        className={`relative w-full ${selectedSize} bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-10 transition-all duration-300 animate-in zoom-in-95 ease-out duration-200 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
