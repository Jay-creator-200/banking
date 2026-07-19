'use client';

import React, { useEffect, useState } from 'react';
import { Save, Printer, ReceiptText } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const defaultForm = {
  templateName: '',
  institutionName: '',
  institutionAddress: '',
  contactLine: '',
  logoUrl: '',
  receiptSize: 'A4',
  showLogo: true,
  showWatermark: true,
  footerNote: '',
  authorizedSignatoryLabel: '',
};

export default function ReceiptSettingsPage() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/receipts/settings')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error?.message || 'Failed to load receipt settings');
        setForm({ ...defaultForm, ...(json.data || {}) });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/receipts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save settings');
      setForm({ ...defaultForm, ...(json.data || {}) });
      setMessage('Receipt layout saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  if (loading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipt Layout"
        subtitle="Configure printable receipt header, footer, paper size, and preview style."
        icon={ReceiptText}
        action={
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 print:hidden">
            <Printer className="w-4 h-4" /> Preview Print
          </button>
        }
      />

      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">{error}</div>}
      {message && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">{message}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <CardWrapper className="p-5 print:hidden">
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className={labelClass}>Template Name</label>
              <input className={inputClass} value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Institution Name</label>
              <input className={inputClass} value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <textarea rows={3} className={`${inputClass} resize-none`} value={form.institutionAddress} onChange={(e) => setForm({ ...form, institutionAddress: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Contact Line</label>
              <input className={inputClass} value={form.contactLine} onChange={(e) => setForm({ ...form, contactLine: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Logo URL</label>
              <input className={inputClass} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Paper Size</label>
                <select className={inputClass} value={form.receiptSize} onChange={(e) => setForm({ ...form, receiptSize: e.target.value })}>
                  <option value="A4">A4</option>
                  <option value="THERMAL_80">Thermal 80mm</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Signatory Label</label>
                <input className={inputClass} value={form.authorizedSignatoryLabel} onChange={(e) => setForm({ ...form, authorizedSignatoryLabel: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={form.showLogo} onChange={(e) => setForm({ ...form, showLogo: e.target.checked })} />
              Show logo
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={form.showWatermark} onChange={(e) => setForm({ ...form, showWatermark: e.target.checked })} />
              Show watermark
            </label>
            <div>
              <label className={labelClass}>Footer Note</label>
              <textarea rows={3} className={`${inputClass} resize-none`} value={form.footerNote} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} />
            </div>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Layout'}
            </button>
          </form>
        </CardWrapper>

        <ReceiptPreview settings={form} />
      </div>
    </div>
  );
}

function ReceiptPreview({ settings }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-900 p-4 print:p-0 print:bg-white">
      <div className={`mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm print:shadow-none relative ${settings.receiptSize === 'THERMAL_80' ? 'max-w-[320px]' : 'max-w-[780px]'}`}>
        {settings.showWatermark && <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-slate-100 rotate-[-25deg] pointer-events-none">RECEIPT</div>}
        <div className="relative p-8 space-y-6">
          <div className="text-center border-b border-slate-300 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {settings.showLogo && settings.logoUrl && <img src={settings.logoUrl} alt="" className="h-12 mx-auto mb-2 object-contain" />}
            <h2 className="text-xl font-black uppercase">{settings.institutionName || 'Institution Name'}</h2>
            <p className="text-xs mt-1 whitespace-pre-wrap">{settings.institutionAddress || 'Institution address'}</p>
            <p className="text-xs">{settings.contactLine || 'Contact line'}</p>
          </div>
          <div className="flex justify-between text-xs">
            <div><b>Receipt No:</b> RCPT-PREVIEW</div>
            <div><b>Date:</b> {new Date().toLocaleString('en-IN')}</div>
          </div>
          <div className="border border-slate-300">
            {[
              ['Particulars', 'Sample savings deposit receipt'],
              ['Member / Payee', 'Rahul Sharma'],
              ['Account / Reference', 'SAV-2026-000001'],
              ['Payment Mode', 'CASH'],
              ['Amount', 'Rs. 10,000.00'],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[160px_1fr] border-b last:border-b-0 border-slate-300 text-xs">
                <div className="p-2 font-bold bg-slate-50 border-r border-slate-300">{label}</div>
                <div className="p-2">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-10 text-xs font-bold">
            <span>Customer Copy</span>
            <span>{settings.authorizedSignatoryLabel || 'Authorized Signatory'}</span>
          </div>
          <p className="text-[10px] text-center text-slate-500 border-t border-slate-200 pt-3">{settings.footerNote}</p>
        </div>
      </div>
    </div>
  );
}
