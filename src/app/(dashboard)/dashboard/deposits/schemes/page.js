'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LibraryBig, Plus, RefreshCcw, Settings2, AlertTriangle,
  ChevronDown, ChevronUp, Search, CheckCircle, XCircle,
  BadgePercent, Clock, TrendingUp, Layers, Pencil
} from 'lucide-react';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const SCHEME_TYPES = ['RD', 'FD', 'DDS', 'MIS'];
const INTEREST_TYPES = ['simple', 'compound'];
const COMPOUNDING_FREQS = ['monthly', 'quarterly', 'yearly'];
const TENURE_UNITS = ['months', 'days'];
const INSTALLMENT_FREQS = ['daily', 'weekly', 'monthly'];
const PENALTY_TYPES = ['fixed', 'percentage'];

const schemeTypeColors = {
  RD: 'bg-blue-50 text-blue-700 border-blue-200',
  FD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DDS: 'bg-violet-50 text-violet-700 border-violet-200',
  MIS: 'bg-amber-50 text-amber-700 border-amber-200',
};
const schemeTypeIcons = { RD: TrendingUp, FD: Layers, DDS: BadgePercent, MIS: Clock };

const emptyForm = {
  schemeCode: '', schemeName: '', schemeType: 'RD', description: '',
  interestType: 'simple', interestRate: 7, compoundingFrequency: 'monthly',
  minimumTenure: 6, maximumTenure: 60, tenureUnit: 'months',
  minimumDepositAmount: 500, maximumDepositAmount: 100000,
  installmentFrequency: 'monthly',
  latePaymentPenaltyType: 'percentage', latePaymentPenaltyValue: 1,
  allowedPrematureClosure: true, prematurePenaltyRate: 1,
  autoRenewalAllowed: false,
};

export default function DepositSchemesPage() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingSchemeId, setEditingSchemeId] = useState(null);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/deposit-schemes?limit=100');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load schemes');
      setSchemes(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingSchemeId(null);
    setFormError(null);
  };

  const openCreateForm = () => {
    if (showForm && !editingSchemeId) {
      setShowForm(false);
      setFormError(null);
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const startEdit = (scheme) => {
    setEditingSchemeId(scheme._id);
    setForm({
      schemeCode: scheme.schemeCode || '',
      schemeName: scheme.schemeName || '',
      schemeType: scheme.schemeType || 'RD',
      description: scheme.description || '',
      interestType: scheme.interestType || 'simple',
      interestRate: scheme.interestRate ?? 0,
      compoundingFrequency: scheme.compoundingFrequency || 'monthly',
      minimumTenure: scheme.minimumTenure ?? 1,
      maximumTenure: scheme.maximumTenure ?? 1,
      tenureUnit: scheme.tenureUnit || 'months',
      minimumDepositAmount: scheme.minimumDepositAmount ?? 1,
      maximumDepositAmount: scheme.maximumDepositAmount ?? 1,
      installmentFrequency: scheme.installmentFrequency || 'monthly',
      latePaymentPenaltyType: scheme.latePaymentPenaltyType || 'percentage',
      latePaymentPenaltyValue: scheme.latePaymentPenaltyValue ?? 0,
      allowedPrematureClosure: scheme.allowedPrematureClosure ?? true,
      prematurePenaltyRate: scheme.prematurePenaltyRate ?? 0,
      autoRenewalAllowed: scheme.autoRenewalAllowed ?? false,
    });
    setFormError(null);
    setShowForm(true);
    setExpandedId(scheme._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editingSchemeId ? `/api/deposit-schemes/${editingSchemeId}` : '/api/deposit-schemes', {
        method: editingSchemeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `Failed to ${editingSchemeId ? 'update' : 'create'} scheme`);
      setShowForm(false);
      resetForm();
      fetchSchemes();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = schemes.filter(s => {
    const matchSearch = !search || s.schemeName?.toLowerCase().includes(search.toLowerCase()) || s.schemeCode?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || s.schemeType === filterType;
    return matchSearch && matchType;
  });

  const InputClass = "w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const LabelClass = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposit Scheme Configuration"
        subtitle="Manage RD, FD, DDS & MIS scheme rules, interest rates, and penalty structures"
        icon={LibraryBig}
        action={
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            id="btn-add-scheme"
          >
            <Plus className="w-4 h-4" />
            {showForm && !editingSchemeId ? 'Close Form' : 'New Scheme'}
          </button>
        }
      />

      {/* Scheme Form Panel */}
      {showForm && (
        <CardWrapper className="p-6 space-y-5 border-l-4 border-indigo-500">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-500" />
            {editingSchemeId ? 'Edit Deposit Scheme' : 'Create New Deposit Scheme'}
          </h3>
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />{formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={LabelClass}>Scheme Code *</label>
                <input className={InputClass} value={form.schemeCode} onChange={e => setForm({ ...form, schemeCode: e.target.value })} placeholder="e.g. RD01" required id="scheme-code" />
              </div>
              <div>
                <label className={LabelClass}>Scheme Name *</label>
                <input className={InputClass} value={form.schemeName} onChange={e => setForm({ ...form, schemeName: e.target.value })} placeholder="e.g. Monthly RD Plan" required id="scheme-name" />
              </div>
              <div>
                <label className={LabelClass}>Scheme Type *</label>
                <select className={InputClass} value={form.schemeType} onChange={e => setForm({ ...form, schemeType: e.target.value })} id="scheme-type">
                  {SCHEME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className={LabelClass}>Description</label>
                <input className={InputClass} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the scheme" id="scheme-desc" />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Interest Settings</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={LabelClass}>Interest Type</label>
                  <select className={InputClass} value={form.interestType} onChange={e => setForm({ ...form, interestType: e.target.value })} id="interest-type">
                    {INTEREST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Interest Rate (% p.a.) *</label>
                  <input type="number" min="0" max="30" step="0.01" className={InputClass} value={form.interestRate} onChange={e => setForm({ ...form, interestRate: parseFloat(e.target.value) })} required id="interest-rate" />
                </div>
                {form.interestType === 'compound' && (
                  <div>
                    <label className={LabelClass}>Compounding Frequency</label>
                    <select className={InputClass} value={form.compoundingFrequency} onChange={e => setForm({ ...form, compoundingFrequency: e.target.value })} id="comp-freq">
                      {COMPOUNDING_FREQS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={LabelClass}>Installment Frequency</label>
                  <select className={InputClass} value={form.installmentFrequency} onChange={e => setForm({ ...form, installmentFrequency: e.target.value })} id="installment-freq">
                    {INSTALLMENT_FREQS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Tenure & Deposit Limits</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={LabelClass}>Min Tenure *</label>
                  <input type="number" min="1" className={InputClass} value={form.minimumTenure} onChange={e => setForm({ ...form, minimumTenure: parseInt(e.target.value) })} required />
                </div>
                <div>
                  <label className={LabelClass}>Max Tenure *</label>
                  <input type="number" min="1" className={InputClass} value={form.maximumTenure} onChange={e => setForm({ ...form, maximumTenure: parseInt(e.target.value) })} required />
                </div>
                <div>
                  <label className={LabelClass}>Tenure Unit</label>
                  <select className={InputClass} value={form.tenureUnit} onChange={e => setForm({ ...form, tenureUnit: e.target.value })}>
                    {TENURE_UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Min Deposit (₹) *</label>
                  <input type="number" min="0" className={InputClass} value={form.minimumDepositAmount} onChange={e => setForm({ ...form, minimumDepositAmount: parseFloat(e.target.value) })} required />
                </div>
                <div>
                  <label className={LabelClass}>Max Deposit (₹)</label>
                  <input type="number" min="0" className={InputClass} value={form.maximumDepositAmount} onChange={e => setForm({ ...form, maximumDepositAmount: parseFloat(e.target.value) })} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Penalty & Closure Rules</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={LabelClass}>Penalty Type</label>
                  <select className={InputClass} value={form.latePaymentPenaltyType} onChange={e => setForm({ ...form, latePaymentPenaltyType: e.target.value })}>
                    {PENALTY_TYPES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Penalty Value</label>
                  <input type="number" min="0" step="0.01" className={InputClass} value={form.latePaymentPenaltyValue} onChange={e => setForm({ ...form, latePaymentPenaltyValue: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className={LabelClass}>Premature Penalty Rate (%)</label>
                  <input type="number" min="0" step="0.01" className={InputClass} value={form.prematurePenaltyRate} onChange={e => setForm({ ...form, prematurePenaltyRate: parseFloat(e.target.value) })} />
                </div>
                <div className="flex flex-col gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.allowedPrematureClosure} onChange={e => setForm({ ...form, allowedPrematureClosure: e.target.checked })} className="rounded" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Allow Premature Closure</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.autoRenewalAllowed} onChange={e => setForm({ ...form, autoRenewalAllowed: e.target.checked })} className="rounded" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto Renewal Allowed</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50" id="btn-submit-scheme">
                {submitting ? (editingSchemeId ? 'Saving...' : 'Creating...') : (editingSchemeId ? 'Save Changes' : 'Create Scheme')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </form>
        </CardWrapper>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search schemes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            id="scheme-search"
          />
        </div>
        <div className="flex gap-2">
          {['', ...SCHEME_TYPES].map(t => (
            <button
              key={t || 'all'}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border ${filterType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
            >
              {t || 'All'}
            </button>
          ))}
          <button onClick={fetchSchemes} className="px-3 py-2 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 transition-all" title="Refresh">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Schemes List */}
      {loading ? (
        <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <CardWrapper className="py-24 text-center">
          <LibraryBig className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No deposit schemes found</p>
          <p className="text-xs text-slate-400 mt-1">Create your first scheme to get started</p>
        </CardWrapper>
      ) : (
        <div className="space-y-3">
          {filtered.map(scheme => {
            const Icon = schemeTypeIcons[scheme.schemeType] || Settings2;
            const colorClass = schemeTypeColors[scheme.schemeType] || 'bg-slate-50 text-slate-700 border-slate-200';
            const isExpanded = expandedId === scheme._id;
            return (
              <CardWrapper key={scheme._id} className="p-0 overflow-hidden">
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                  onClick={() => setExpandedId(isExpanded ? null : scheme._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{scheme.schemeName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${colorClass}`}>{scheme.schemeType}</span>
                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{scheme.schemeCode}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{scheme.description || 'No description provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-extrabold text-indigo-600">{scheme.interestRate}% p.a.</p>
                      <p className="text-[10px] text-slate-400 font-mono">{scheme.interestType} interest</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{scheme.minimumTenure}–{scheme.maximumTenure} {scheme.tenureUnit}</p>
                      <p className="text-[10px] text-slate-400">tenure range</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(scheme);
                      }}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 bg-white dark:bg-slate-900 transition-all"
                      title="Edit scheme"
                      aria-label={`Edit ${scheme.schemeName}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      {[
                        { label: 'Interest Rate', value: `${scheme.interestRate}% p.a.` },
                        { label: 'Interest Type', value: scheme.interestType?.charAt(0).toUpperCase() + scheme.interestType?.slice(1) },
                        { label: 'Compounding Freq.', value: scheme.compoundingFrequency || 'N/A' },
                        { label: 'Installment Freq.', value: scheme.installmentFrequency || 'N/A' },
                        { label: 'Min Deposit', value: `₹${(scheme.minimumDepositAmount || 0).toLocaleString()}` },
                        { label: 'Max Deposit', value: `₹${(scheme.maximumDepositAmount || 0).toLocaleString()}` },
                        { label: 'Late Penalty', value: scheme.latePaymentPenaltyType ? `${scheme.latePaymentPenaltyValue} (${scheme.latePaymentPenaltyType})` : 'None' },
                        { label: 'Premature Penalty', value: `${scheme.prematurePenaltyRate || 0}%` },
                        { label: 'Premature Closure', value: scheme.allowedPrematureClosure ? 'Allowed' : 'Not Allowed' },
                        { label: 'Auto Renewal', value: scheme.autoRenewalAllowed ? 'Enabled' : 'Disabled' },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardWrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
