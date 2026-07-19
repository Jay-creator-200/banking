'use client';

import React, { useState } from 'react';
import { Menu, Bell, Sun, Moon, Landmark } from 'lucide-react';
import UserProfileDropdown from './UserProfileDropdown.jsx';
import PwaInstallButton from '@/components/shared/PwaInstallButton.jsx';

/**
 * Premium dashboard Header panel.
 * Contains responsive hamburger menu controls, active branch selector scoped for multi-branch,
 * light/dark theme switches, notifications, and profiles dropdown.
 *
 * @param {Object} props
 * @param {boolean} props.sidebarOpen
 * @param {function(boolean): void} props.setSidebarOpen
 * @param {string} props.theme - 'light' | 'dark'
 * @param {function(string): void} props.setTheme
 */
export function Header({
  sidebarOpen,
  setSidebarOpen,
  theme,
  setTheme,
}) {
  const [selectedBranch, setSelectedBranch] = useState('MHO');

  const branches = [
    { code: 'MHO', name: 'Main Head Office' },
    { code: 'SMB', name: 'South Metro Branch' },
    { code: 'ECB', name: 'East Commercial Branch' },
  ];

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    // Apply layout element classes
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-3 sm:px-6 bg-white dark:bg-slate-950 border-b border-slate-200/90 dark:border-slate-800/80 transition-colors duration-200">
      {/* Left side actions: hamburger + branch scopes */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Branch Scope Selector (Critical parameter for auditing & access rules) */}
        <div className="flex items-center gap-1 sm:gap-2 border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-350 shadow-sm max-w-[140px] sm:max-w-none">
          <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-transparent text-[11px] sm:text-xs font-semibold focus:outline-none pr-1.5 cursor-pointer border-none text-slate-850 dark:text-slate-200 max-w-[80px] xs:max-w-[120px] sm:max-w-none truncate"
          >
            {branches.map((b) => (
              <option
                key={b.code}
                value={b.code}
                className="bg-white dark:bg-slate-950 text-slate-750 dark:text-slate-300"
              >
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right side operations: theme, notifications & user profiles */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        <PwaInstallButton />

        {/* Toggle dark themes */}
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* System alerts notifications */}
        <div className="relative">
          <button className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all relative cursor-pointer">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
          </button>
        </div>

        <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-800 shrink-0" />

        {/* User Account actions */}
        <UserProfileDropdown />
      </div>
    </header>
  );
}

export default Header;
