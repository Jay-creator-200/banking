'use client';

import React from 'react';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Bookmark, 
  HelpCircle, 
  Settings,
  ShieldCheck,
  Building,
  Flag
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import { APP_CONFIG } from '@/constants/app-config.js';

export default function SettingsPage() {
  const settings = APP_CONFIG.organizationSettings;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings"
        subtitle="Manage and view the cooperative society branding, regional configurations, and default currency parameters."
        breadcrumbs={[
          { label: 'Platform Core', href: '/dashboard' },
          { label: 'Administration', href: '#' },
          { label: 'Settings', href: '#' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Panel */}
        <CardWrapper className="lg:col-span-2 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Society Profile Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 flex gap-4 items-start">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Society Name</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{settings.organizationName}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 flex gap-4 items-start">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-650 rounded-xl">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Short Code</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{settings.shortName}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 flex gap-4 items-start">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-650 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">City / Branch Hub</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{settings.city}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 flex gap-4 items-start">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-650 rounded-xl">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">State / Region</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{settings.state}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 flex gap-4 items-start md:col-span-2">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-650 rounded-xl">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Country</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{settings.country}</p>
              </div>
            </div>
          </div>
        </CardWrapper>

        {/* Operational Constraints Sidebar Card */}
        <div className="space-y-6">
          <CardWrapper className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800">
              <Settings className="w-5 h-5 text-indigo-650" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Constants</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-850">
                <span className="text-slate-400 font-bold">Base Currency</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{APP_CONFIG.CURRENCY.CODE} ({APP_CONFIG.CURRENCY.SYMBOL})</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-850">
                <span className="text-slate-400 font-bold">Interest Precision</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{APP_CONFIG.INTEREST_ROUNDING_DECIMALS} Decimals</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-slate-850">
                <span className="text-slate-400 font-bold">System Timezone</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{APP_CONFIG.SYSTEM_TZ}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Release Build</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">v{APP_CONFIG.VERSION}</span>
              </div>
            </div>
          </CardWrapper>

          <CardWrapper className="p-6 bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-900/40 text-white space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Society Governance</h4>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed">
              Noble Cooperative Society (NCS) operates as a registered financial cooperative under the state laws of Rajasthan, India. Operating limits and maker-checker validation rules are defined on a per-role basis.
            </p>
            <div className="pt-2">
              <span className="px-3 py-1.5 bg-indigo-900/60 border border-indigo-750 text-[10px] font-bold tracking-wide rounded-full text-indigo-300">
                Status: Operational Hub
              </span>
            </div>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}
