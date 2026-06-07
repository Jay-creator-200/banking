'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Slide-out panel component opening from the right side of the window.
 * Great for adding records or viewing long detail files.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function(): void} props.onClose
 * @param {string} props.title - Sidebar title text.
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) {
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-[3px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out block wrapper */}
      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <div
          className={`w-screen max-w-md bg-white dark:bg-slate-950 border-l border-slate-200/90 dark:border-slate-800/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-350 ease-out ${className}`}
        >
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-all rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close Drawer</span>
            </button>
          </div>

          <div className="flex-1 px-6 py-5 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Drawer;
