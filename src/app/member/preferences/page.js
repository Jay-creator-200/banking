'use client';

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone, Bell, ShieldCheck } from 'lucide-react';

export default function MemberPreferences() {
  const [prefs, setPrefs] = useState({
    smsEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
    transactionAlerts: true,
    loanAlerts: true,
    depositAlerts: true,
    marketingAlerts: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/member/preferences');
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Failed to fetch preferences');
        if (res.data) {
          setPrefs({
            smsEnabled: res.data.smsEnabled,
            emailEnabled: res.data.emailEnabled,
            whatsappEnabled: res.data.whatsappEnabled,
            transactionAlerts: res.data.transactionAlerts,
            loanAlerts: res.data.loanAlerts,
            depositAlerts: res.data.depositAlerts,
            marketingAlerts: res.data.marketingAlerts || false,
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  const handleToggle = (field) => {
    setPrefs((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    setSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const response = await fetch('/api/member/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to save preference settings');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Loading alert profiles...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Alert & Communication Preferences</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure your preferred notification channels and alert triggers.</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-2.5 animate-in fade-in duration-300">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Notification preferences successfully updated!</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-455">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Channels */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Notification Channels</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* SMS Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">SMS Notifications</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Receive text messages on your registered mobile number.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('smsEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  prefs.smsEnabled ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-850'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.smsEnabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Email Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Alerts</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Receive HTML receipts and statements on your registered email address.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('emailEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  prefs.emailEnabled ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-850'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.emailEnabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* WhatsApp Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">WhatsApp Updates</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Receive transaction summaries and EMI due dates on WhatsApp.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('whatsappEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  prefs.whatsappEnabled ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-850'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.whatsappEnabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Alert Categories */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alert Triggers</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Transaction Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Transaction Alerts</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notify me on savings deposits, withdrawals, or credit updates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('transactionAlerts')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  prefs.transactionAlerts ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-850'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.transactionAlerts ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Loan Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Loan & EMI Alerts</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notify me when EMI installments are due, paid, or overdue.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('loanAlerts')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  prefs.loanAlerts ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-850'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.loanAlerts ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Deposit Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Deposit Maturity Alerts</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notify me prior to FD, RD, or daily deposit maturity dates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('depositAlerts')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  prefs.depositAlerts ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-850'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.depositAlerts ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving changes...' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}
