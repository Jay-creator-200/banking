'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  PiggyBank,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Menu,
  User
} from 'lucide-react';

export default function MemberLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider animate-pulse">Loading Member Terminal...</span>
      </div>
    );
  }

  // Double check auth verification in client layout
  if (status === 'unauthenticated' || session?.user?.roleCode !== 'MEMBER') {
    return null; // Let middleware redirect
  }

  const user = session?.user;
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MB';

  const menuItems = [
    { label: 'Dashboard', href: '/member/dashboard', icon: LayoutDashboard },
    { label: 'Accounts & Statements', href: '/member/accounts', icon: Wallet },
    { label: 'My Loans & EMIs', href: '/member/loans', icon: Landmark },
    { label: 'Deposit Schemes', href: '/member/deposits', icon: PiggyBank },
    { label: 'Document Locker', href: '/member/documents', icon: FileText },
    { label: 'Alert Preferences', href: '/member/preferences', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-slate-200/90 dark:border-slate-800/80 bg-slate-950 text-slate-400 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Logotype */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center shrink-0 text-white font-bold text-base shadow-sm shadow-indigo-550">
              A
            </div>
            {sidebarOpen && (
              <span className="font-bold text-white text-sm whitespace-nowrap tracking-wide animate-in fade-in duration-200">
                APEX PORTAL
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 ${
                !sidebarOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Member Menu Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/20'
                    : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {sidebarOpen ? (
                  <span className="truncate">{item.label}</span>
                ) : (
                  <span className="absolute left-16 bg-slate-950 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl whitespace-nowrap z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Sign Out */}
        <div className="p-3 border-t border-slate-900 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-rose-450 hover:bg-rose-950/20 hover:text-rose-400 transition-all cursor-pointer ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarOpen ? 'pl-64' : 'pl-20'
        }`}
      >
        {/* Header Panel */}
        <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-6 bg-white dark:bg-slate-950 border-b border-slate-200/90 dark:border-slate-800/80 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline-block">
              Welcome back to your Cooperative Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Profile Dropdown Badge */}
            <div className="flex items-center gap-2.5 p-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200/20 uppercase">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                  {user?.fullName}
                </p>
                <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase tracking-wider">
                  MEMBER
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner views */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
