'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import Link from 'next/link';

/**
 * Premium profile navigation dropdown showing operator metadata, email links, and settings anchors.
 */
export function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl transition-all text-left cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200/20">
          JD
        </div>
        <div className="hidden md:block shrink-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
            John Doe
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">
            Branch Manager
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User metadata header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/10">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              John Doe
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-1">
              john.doe@apexbank.coop
            </p>
          </div>

          {/* Action anchors links */}
          <div className="p-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all font-semibold"
            >
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>My Profile</span>
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all font-semibold"
            >
              <Settings className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Account Settings</span>
            </Link>
          </div>

          {/* Sign out separator */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 p-1">
            <button
              onClick={() => {
                setIsOpen(false);
                alert('Sign out triggered. Auth.js implementation will follow in next phase.');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfileDropdown;
