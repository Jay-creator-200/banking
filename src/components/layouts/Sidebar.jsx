'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Landmark,
  FileText,
  Settings,
  ShieldCheck,
  ChevronLeft,
  Briefcase,
  History,
  Building2,
  Key,
  ShieldAlert,
  RotateCcw,
  FolderTree,
  ArrowRightLeft,
  Vault,
  FileSpreadsheet,
  PiggyBank,
  CalendarClock,
  TrendingUp,
  Coins,
  BarChart3,
  LibraryBig
} from 'lucide-react';
import { ROUTES } from '@/constants/routes.js';
import { APP_CONFIG } from '@/constants/app-config.js';

const navigationGroups = [
  {
    title: 'Core Platform',
    items: [
      { label: 'Dashboard', href: ROUTES.DASHBOARD.HOME, icon: LayoutDashboard },
      { label: 'Members', href: ROUTES.DASHBOARD.MEMBERS, icon: Users },
      { label: 'Member Reports', href: ROUTES.DASHBOARD.MEMBER_REPORTS, icon: FileText },
      { label: 'Savings Accounts', href: ROUTES.DASHBOARD.SAVINGS_ACCOUNTS, icon: Wallet },
      { label: 'Loans', href: ROUTES.DASHBOARD.LOANS, icon: Landmark },
      { label: 'Teller Ops', href: ROUTES.DASHBOARD.TELLER, icon: Briefcase },
      { label: 'Cash Transfers', href: ROUTES.DASHBOARD.TELLER_TRANSFERS, icon: ArrowRightLeft },
      { label: 'Vault', href: ROUTES.DASHBOARD.TELLER_VAULT, icon: Vault },
      { label: 'Teller Reports', href: ROUTES.DASHBOARD.TELLER_REPORTS, icon: FileSpreadsheet },
      { label: 'Workflows', href: ROUTES.DASHBOARD.WORKFLOWS, icon: ShieldCheck },
    ]
  },
  {
    title: 'Financial Core',
    items: [
      { label: 'Transactions', href: ROUTES.DASHBOARD.TRANSACTIONS, icon: Briefcase },
      { label: 'Reversals', href: ROUTES.DASHBOARD.REVERSALS, icon: RotateCcw },
      { label: 'Approvals', href: ROUTES.DASHBOARD.APPROVALS, icon: ShieldCheck },
      { label: 'Chart of Accounts', href: ROUTES.DASHBOARD.ACCOUNT_HEADS, icon: FolderTree },
      { label: 'Journal Vouchers', href: ROUTES.DASHBOARD.JOURNAL_VOUCHERS, icon: FileText },
      { label: 'General Ledger', href: ROUTES.DASHBOARD.LEDGER, icon: History },
    ]
  },
  {
    title: 'Access Control',
    items: [
      { label: 'Employees', href: ROUTES.DASHBOARD.USERS, icon: Users },
      { label: 'Roles & Authority', href: ROUTES.DASHBOARD.ROLES, icon: Key },
      { label: 'Branch Registry', href: ROUTES.DASHBOARD.BRANCHES, icon: Building2 },
    ]
  },
  {
    title: 'Deposit Operations',
    items: [
      { label: 'Scheme Setup', href: ROUTES.DASHBOARD.DEPOSIT_SCHEMES, icon: LibraryBig },
      { label: 'Recurring Deposits', href: ROUTES.DASHBOARD.DEPOSIT_RD, icon: CalendarClock },
      { label: 'Fixed Deposits', href: ROUTES.DASHBOARD.DEPOSIT_FD, icon: TrendingUp },
      { label: 'Daily Deposits', href: ROUTES.DASHBOARD.DEPOSIT_DDS, icon: Coins },
      { label: 'Monthly Income', href: ROUTES.DASHBOARD.DEPOSIT_MIS, icon: PiggyBank },
      { label: 'Deposit Reports', href: ROUTES.DASHBOARD.DEPOSIT_REPORTS, icon: BarChart3 },
    ]
  },
  {
    title: 'Auditing & Security',
    items: [
      { label: 'Login Audits', href: ROUTES.DASHBOARD.LOGIN_LOGS, icon: ShieldAlert },
      { label: 'Audit Trail', href: ROUTES.DASHBOARD.AUDIT, icon: History },
    ]
  }
];

/**
 * Premium collapsible navigation Sidebar container.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Current expanded state.
 * @param {function(boolean): void} props.setIsOpen - Toggle sidebar width callback.
 */
export function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-slate-200/90 dark:border-slate-800/80 bg-slate-900 text-slate-400 flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand logotype segment */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center shrink-0 text-white font-bold text-base shadow-sm shadow-indigo-550">
            N
          </div>
          {isOpen && (
            <span className="font-bold text-white text-sm whitespace-nowrap tracking-wide animate-in fade-in duration-200">
              {APP_CONFIG.NAME.split(' ')[0]}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              !isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {navigationGroups.map((group, groupIdx) => (
          <div key={`group-${groupIdx}`} className="space-y-1.5">
            {isOpen && (
              <h4 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {group.title}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 relative group ${
                      isActive
                        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/20'
                        : 'hover:bg-slate-800/65 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    {isOpen ? (
                      <span className="truncate">{item.label}</span>
                    ) : (
                      <span className="absolute left-16 bg-slate-950 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl whitespace-nowrap z-50">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-slate-800/80 text-[10px] text-slate-500 font-bold tracking-wider text-center shrink-0">
        {isOpen ? `v${APP_CONFIG.VERSION}` : 'v0.1'}
      </div>
    </aside>
  );
}

export default Sidebar;
