'use client';

import React, { useState, useEffect } from 'react';
import { Send, Users, FileText, Activity, AlertCircle, Mail, MessageSquare, Phone, CheckCircle, Search, Clock } from 'lucide-react';

export default function AdminCommunications() {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Lists for dropdowns
  const [members, setMembers] = useState([]);

  // Send forms
  const [individualForm, setIndividualForm] = useState({
    memberId: '',
    type: 'SMS',
    category: 'system',
    title: '',
    message: '',
  });

  const [bulkForm, setBulkForm] = useState({
    memberCategory: 'all',
    type: 'SMS',
    category: 'system',
    title: '',
    message: '',
  });

  const [individualLoading, setIndividualLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [individualSuccess, setIndividualSuccess] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);

  // Template reference
  const templates = [
    { name: 'Member Welcome', category: 'system', channels: ['EMAIL'], body: 'Dear {Name}, Welcome to the family! Your membership number is {MemberNo}. Login username: {Username}.' },
    { name: 'Transaction Receipt', category: 'transaction', channels: ['SMS', 'EMAIL', 'WHATSAPP'], body: 'Transaction alert: Your account {AccountNo} has been debited/credited with {Amount} on {Date}.' },
    { name: 'EMI Due Reminder', category: 'reminder', channels: ['SMS', 'EMAIL', 'WHATSAPP'], body: 'Reminder: Your EMI of {Amount} for loan {LoanNo} is due on {Date}.' },
    { name: 'Deposit Maturity Alert', category: 'reminder', channels: ['SMS', 'EMAIL', 'WHATSAPP'], body: 'Alert: Your deposit account {AccountNo} matures on {Date}. Proceeds: {Amount}.' },
  ];

  const fetchLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`/api/notifications?page=${page}&limit=10`);
      const res = await response.json();
      if (res.success) {
        setLogs(res.data || []);
        setMeta(res.meta || { total: 0, page: 1, pages: 1 });
      }
    } catch (err) {
      console.error('Failed to load logs:', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Fetch members list for dropdown
    async function loadMembers() {
      try {
        const response = await fetch('/api/members?limit=100');
        const res = await response.json();
        if (res.success && res.data) {
          setMembers(res.data.docs || []);
        }
      } catch (err) {
        console.error('Failed to load members:', err.message);
      }
    }
    loadMembers();
  }, []);

  const handleSendIndividual = async (e) => {
    e.preventDefault();
    setIndividualLoading(true);
    setIndividualSuccess(false);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(individualForm),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to send individual alert');
      setIndividualSuccess(true);
      setIndividualForm({ memberId: '', type: 'SMS', category: 'system', title: '', message: '' });
      fetchLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setIndividualLoading(false);
    }
  };

  const handleSendBulk = async (e) => {
    e.preventDefault();
    setBulkLoading(true);
    setBulkSuccess(false);
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkForm),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to dispatch bulk broadcasts');
      setBulkSuccess(true);
      setBulkForm({ memberCategory: 'all', type: 'SMS', category: 'system', title: '', message: '' });
      fetchLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Calculate statistics from the logs
  const totalSent = logs.filter(l => l.status === 'sent' || l.status === 'read').length;
  const totalFailed = logs.filter(l => l.status === 'failed').length;
  const totalPending = logs.filter(l => l.status === 'pending').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Communications & Notification Desk</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage individual alerts, broadcast bulk campaigns, and oversee delivery status reports.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Total logged</p>
            <h3 className="text-lg font-bold mt-1 text-slate-900 dark:text-white">{meta.total}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Sent / Delivered</p>
            <h3 className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-450">{totalSent}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Failed Attempts</p>
            <h3 className="text-lg font-bold mt-1 text-rose-600 dark:text-rose-450">{totalFailed}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Pending Queue</p>
            <h3 className="text-lg font-bold mt-1 text-amber-600 dark:text-amber-450">{totalPending}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700'
          }`}
        >
          Delivery logs
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'send'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700'
          }`}
        >
          Dispatch Terminal
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700'
          }`}
        >
          Template reference
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
        {activeTab === 'logs' && (
          <div>
            {loadingLogs ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-500">Retrieving notification registers...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No sent notifications found in this database session.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-850">
                      <th className="px-6 py-4">Recipient</th>
                      <th className="px-6 py-4">Message Details</th>
                      <th className="px-6 py-4 text-center">Channel</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4">Dispatched At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {logs.map((log) => {
                      const dateStr = new Date(log.createdAt).toLocaleString('en-IN');
                      return (
                        <tr key={log._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-850 dark:text-slate-200">
                              {log.memberId?.fullName || 'System User'}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {log.memberId?.memberNo || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-750 dark:text-slate-300">{log.title}</div>
                            <div className="text-slate-500 dark:text-slate-400 mt-1 max-w-md">{log.message}</div>
                            <div className="text-[9px] text-slate-400 font-semibold uppercase mt-1 tracking-wider">
                              Category: {log.category} • Ref: {log.notificationNo}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] text-slate-600 dark:text-slate-400">
                              {log.type === 'SMS' && <Phone className="w-3 h-3 text-indigo-500" />}
                              {log.type === 'EMAIL' && <Mail className="w-3 h-3 text-emerald-500" />}
                              {log.type === 'WHATSAPP' && <MessageSquare className="w-3 h-3 text-teal-500" />}
                              {log.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              log.status === 'sent' || log.status === 'read'
                                ? 'bg-emerald-500/10 text-emerald-450'
                                : log.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-450'
                                : 'bg-amber-500/10 text-amber-450'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-450 dark:text-slate-500 font-semibold">{dateStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Pagination */}
                {meta.pages > 1 && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center text-xs">
                    <button
                      onClick={() => fetchLogs(meta.page - 1)}
                      disabled={meta.page === 1}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="font-semibold text-slate-500">Page {meta.page} of {meta.pages}</span>
                    <button
                      onClick={() => fetchLogs(meta.page + 1)}
                      disabled={meta.page === meta.pages}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'send' && (
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-slate-850">
            {/* Form 1: Individual Message */}
            <div className="space-y-6 pb-6 md:pb-0">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-500" /> Send Individual Alert
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Dispatches ad-hoc notifications directly to a member&apos;s preferred communication channels.</p>
              </div>

              {individualSuccess && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-450">
                  Message successfully sent & logged!
                </div>
              )}

              <form onSubmit={handleSendIndividual} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500 mb-1">Target Member</label>
                  <select
                    value={individualForm.memberId}
                    onChange={(e) => setIndividualForm({ ...individualForm, memberId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                    required
                  >
                    <option value="" className="bg-white dark:bg-slate-950">Select Member...</option>
                    {members.map((mbr) => (
                      <option key={mbr._id} value={mbr._id} className="bg-white dark:bg-slate-950">
                        {mbr.fullName} ({mbr.memberNo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500 mb-1">Channel</label>
                    <select
                      value={individualForm.type}
                      onChange={(e) => setIndividualForm({ ...individualForm, type: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="SMS" className="bg-white dark:bg-slate-950">SMS Channel</option>
                      <option value="EMAIL" className="bg-white dark:bg-slate-950">Email Channel</option>
                      <option value="WHATSAPP" className="bg-white dark:bg-slate-950">WhatsApp API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500 mb-1">Category</label>
                    <select
                      value={individualForm.category}
                      onChange={(e) => setIndividualForm({ ...individualForm, category: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="system" className="bg-white dark:bg-slate-950">System</option>
                      <option value="reminder" className="bg-white dark:bg-slate-950">Reminder</option>
                      <option value="security" className="bg-white dark:bg-slate-950">Security</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500 mb-1">Message Title</label>
                  <input
                    type="text"
                    value={individualForm.title}
                    onChange={(e) => setIndividualForm({ ...individualForm, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    placeholder="e.g. Account Security Alert"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-450 dark:text-slate-500 mb-1">Message Body</label>
                  <textarea
                    value={individualForm.message}
                    onChange={(e) => setIndividualForm({ ...individualForm, message: e.target.value })}
                    rows={4}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    placeholder="Type details to transmit..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={individualLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {individualLoading ? 'Transmitting...' : 'Dispatch Message'}
                </button>
              </form>
            </div>

            {/* Form 2: Bulk Broadcast */}
            <div className="space-y-6 pt-6 md:pt-0 md:pl-8">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" /> Bulk Broadcast Engine
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Transmits notifications in bulk to all active members matching the target category.</p>
              </div>

              {bulkSuccess && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-450">
                  Bulk broadcast successfully queued & dispatched!
                </div>
              )}

              <form onSubmit={handleSendBulk} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-455 dark:text-slate-500 mb-1">Target Member Category</label>
                  <select
                    value={bulkForm.memberCategory}
                    onChange={(e) => setBulkForm({ ...bulkForm, memberCategory: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                    required
                  >
                    <option value="all" className="bg-white dark:bg-slate-950">All Active Members</option>
                    <option value="general" className="bg-white dark:bg-slate-950">General Category</option>
                    <option value="senior_citizen" className="bg-white dark:bg-slate-950">Senior Citizens</option>
                    <option value="farmer" className="bg-white dark:bg-slate-950">Farmers</option>
                    <option value="business" className="bg-white dark:bg-slate-950">Business Accounts</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-455 dark:text-slate-500 mb-1">Channel</label>
                    <select
                      value={bulkForm.type}
                      onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="SMS" className="bg-white dark:bg-slate-950">SMS Broadcast</option>
                      <option value="EMAIL" className="bg-white dark:bg-slate-950">Email Campaign</option>
                      <option value="WHATSAPP" className="bg-white dark:bg-slate-950">WhatsApp API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-455 dark:text-slate-500 mb-1">Category</label>
                    <select
                      value={bulkForm.category}
                      onChange={(e) => setBulkForm({ ...bulkForm, category: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="system" className="bg-white dark:bg-slate-950">System</option>
                      <option value="reminder" className="bg-white dark:bg-slate-950">Reminder</option>
                      <option value="security" className="bg-white dark:bg-slate-950">Security</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-455 dark:text-slate-500 mb-1">Broadcast Title</label>
                  <input
                    type="text"
                    value={bulkForm.title}
                    onChange={(e) => setBulkForm({ ...bulkForm, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    placeholder="e.g. AGM Annual Meeting Notice"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-455 dark:text-slate-500 mb-1">Broadcast Message Body</label>
                  <textarea
                    value={bulkForm.message}
                    onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                    rows={4}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                    placeholder="Type details to transmit to matched cohorts..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {bulkLoading ? 'Broadcasting...' : 'Launch Broadcast Campaign'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Communication Templates Reference
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1">Review standard system notification templates and placeholders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((tpl, idx) => (
                <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{tpl.name}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-450">
                      {tpl.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 font-semibold">
                    Supported channels: {tpl.channels.join(', ')}
                  </div>
                  <div className="mt-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-[11px] font-mono text-slate-500 dark:text-slate-400 line-clamp-3">
                    {tpl.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
