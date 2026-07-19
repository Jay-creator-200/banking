'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronDown,
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
  LibraryBig,
  MessageSquare,
  ReceiptText
} from 'lucide-react';
import { ROUTES } from '@/constants/routes.js';
import { APP_CONFIG } from '@/constants/app-config.js';

const navigationGroups = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'Overview', href: ROUTES.DASHBOARD.HOME, icon: LayoutDashboard },
    ]
  },
  {
    title: 'Member Management',
    icon: Users,
    items: [
      { label: 'Members Directory', href: ROUTES.DASHBOARD.MEMBERS, icon: Users },
      { label: 'Member Registration', href: '/dashboard/members/create', icon: Users },
      { label: 'KYC Verification', href: ROUTES.DASHBOARD.MEMBERS, icon: ShieldCheck },
      { label: 'Member Reports', href: ROUTES.DASHBOARD.MEMBER_REPORTS, icon: FileText },
    ]
  },
  {
    title: 'Deposits',
    icon: PiggyBank,
    items: [
      { label: 'Savings Accounts', href: ROUTES.DASHBOARD.SAVINGS_ACCOUNTS, icon: Wallet },
      { label: 'Recurring Deposits (RD)', href: ROUTES.DASHBOARD.DEPOSIT_RD, icon: CalendarClock },
      { label: 'Fixed Deposits (FD)', href: ROUTES.DASHBOARD.DEPOSIT_FD, icon: TrendingUp },
      { label: 'Daily Deposits (DDS)', href: ROUTES.DASHBOARD.DEPOSIT_DDS, icon: Coins },
      { label: 'Monthly Investment (MIS)', href: ROUTES.DASHBOARD.DEPOSIT_MIS, icon: PiggyBank },
      { label: 'Deposit Schemes', href: ROUTES.DASHBOARD.DEPOSIT_SCHEMES, icon: LibraryBig },
    ]
  },
  {
    title: 'Loans',
    icon: Landmark,
    items: [
      { label: 'Active Loans', href: ROUTES.DASHBOARD.LOANS, icon: Landmark },
      { label: 'Loan Applications', href: ROUTES.DASHBOARD.LOANS + '/applications', icon: FileText },
      { label: 'Loan Products', href: ROUTES.DASHBOARD.LOANS + '/products', icon: LibraryBig },
      { label: 'Repayments', href: ROUTES.DASHBOARD.LOANS + '/collections', icon: Coins },
      { label: 'Loan Reports', href: ROUTES.DASHBOARD.LOANS + '/reports', icon: BarChart3 },
    ]
  },
  {
    title: 'Teller Operations',
    icon: Briefcase,
    items: [
      { label: 'Cash Session', href: ROUTES.DASHBOARD.TELLER, icon: Briefcase },
      { label: 'Teller Transfers', href: ROUTES.DASHBOARD.TELLER_TRANSFERS, icon: ArrowRightLeft },
      { label: 'Vault Transactions', href: ROUTES.DASHBOARD.TELLER_VAULT, icon: Vault },
      { label: 'Teller Reports', href: ROUTES.DASHBOARD.TELLER_REPORTS, icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Accounting',
    icon: FolderTree,
    items: [
      { label: 'Chart of Accounts', href: ROUTES.DASHBOARD.ACCOUNT_HEADS, icon: FolderTree },
      { label: 'Transactions Ledger', href: ROUTES.DASHBOARD.TRANSACTIONS, icon: Briefcase },
      { label: 'Journal Vouchers', href: ROUTES.DASHBOARD.JOURNAL_VOUCHERS, icon: FileText },
      { label: 'Opening Balances', href: ROUTES.DASHBOARD.OPENING_BALANCES, icon: Landmark },
      { label: 'General Ledger', href: ROUTES.DASHBOARD.LEDGER, icon: History },
      { label: 'Accounting Reports', href: ROUTES.DASHBOARD.REPORTS, icon: FileSpreadsheet },
    ]
  },
  {
    title: 'Reports',
    icon: BarChart3,
    items: [
      { label: 'Financial Reports', href: ROUTES.DASHBOARD.REPORTS, icon: FileSpreadsheet },
      { label: 'Member Reports', href: ROUTES.DASHBOARD.MEMBER_REPORTS, icon: FileText },
      { label: 'Deposit Reports', href: ROUTES.DASHBOARD.DEPOSIT_REPORTS, icon: BarChart3 },
      { label: 'Loan Reports', href: ROUTES.DASHBOARD.LOANS + '/reports', icon: BarChart3 },
    ]
  },
  {
    title: 'Communication',
    icon: MessageSquare,
    items: [
      { label: 'Communications Desk', href: '/dashboard/communications', icon: MessageSquare },
    ]
  },
  {
    title: 'Administration',
    icon: Settings,
    items: [
      { label: 'Users & Staff', href: ROUTES.DASHBOARD.USERS, icon: Users },
      { label: 'Staff Salary', href: ROUTES.DASHBOARD.STAFF_SALARY, icon: Coins },
      { label: 'Roles & Authority', href: ROUTES.DASHBOARD.ROLES, icon: Key },
      { label: 'Branch Registry', href: ROUTES.DASHBOARD.BRANCHES, icon: Building2 },
      { label: 'Receipt Layout', href: ROUTES.DASHBOARD.RECEIPT_SETTINGS, icon: ReceiptText },
      { label: 'Organization Settings', href: ROUTES.DASHBOARD.SETTINGS, icon: Settings },
      { label: 'Login Audits', href: ROUTES.DASHBOARD.LOGIN_LOGS, icon: ShieldAlert },
      { label: 'Audit Trail', href: ROUTES.DASHBOARD.AUDIT, icon: History },
    ]
  }
];

export function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState({
    'Dashboard': true,
    'Member Management': false,
    'Deposits': false,
    'Loans': false,
    'Teller Operations': false,
    'Accounting': false,
    'Reports': false,
    'Communication': false,
    'Administration': false,
  });

  // Automatically expand group containing active route
  useEffect(() => {
    const activeGroup = navigationGroups.find(group => 
      group.items.some(item => pathname === item.href)
    );
    if (activeGroup) {
      setExpandedGroups(prev => {
        const next = {};
        Object.keys(prev).forEach(key => {
          next[key] = false;
        });
        next[activeGroup.title] = true;
        return next;
      });
    }
  }, [pathname]);

  const toggleGroup = (title) => {
    setExpandedGroups(prev => {
      const isOpening = !prev[title];
      const next = {};
      Object.keys(prev).forEach(key => {
        next[key] = false;
      });
      next[title] = isOpening;
      return next;
    });
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-slate-200/90 bg-white text-slate-600 flex flex-col lg:translate-x-0 ${
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'
      }`}
    >
      {/* Brand logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center shrink-0 text-white font-bold text-base shadow-sm shadow-indigo-550">
            N
          </div>
          {isOpen && (
            <span className="font-bold text-slate-850 text-sm whitespace-nowrap tracking-wide animate-in fade-in duration-200">
              {APP_CONFIG.NAME.split(' ')[0]} Society
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all shrink-0 cursor-pointer"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              !isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {navigationGroups.map((group, groupIdx) => {
          const GroupIcon = group.icon;
          const isGroupExpanded = !!expandedGroups[group.title];
          const hasActiveChild = group.items.some(item => pathname === item.href);

          return (
            <div key={`group-${groupIdx}`} className="space-y-0.5">
              {isOpen ? (
                // Collapsible group header when sidebar is open
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                    hasActiveChild 
                      ? 'text-indigo-650 bg-indigo-50/50' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GroupIcon className="w-4 h-4" />
                    <span>{group.title}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${
                      isGroupExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              ) : (
                // Divider line if sidebar is closed
                <div className="border-t border-slate-100 my-2" />
              )}

              {/* Sub-menu items container */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  !isOpen 
                    ? 'opacity-100 max-h-none' 
                    : isGroupExpanded 
                      ? 'max-h-[350px] opacity-100 mt-0.5 pl-3' 
                      : 'max-h-0 opacity-0 pointer-events-none'
                } space-y-0.5`}
              >
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const ItemIcon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                          : 'hover:bg-slate-50 hover:text-slate-900 text-slate-600'
                      }`}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          setIsOpen(false);
                        }
                      }}
                    >
                      <ItemIcon className="w-4 h-4 shrink-0" />
                      {isOpen ? (
                        <span className="truncate">{item.label}</span>
                      ) : (
                        <span className="absolute left-16 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl whitespace-nowrap z-50">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold tracking-wider text-center shrink-0">
        {isOpen ? `v${APP_CONFIG.VERSION}` : 'v0.1'}
      </div>
    </aside>
  );
}

export default Sidebar;
