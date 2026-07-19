'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Landmark, Save, Receipt } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function OpeningBalancesPage() {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    branchId: '',
    voucherDate: new Date().toISOString().slice(0, 10),
    cashAmount: '',
    bankAmount: '',
    narration: 'Opening balance migration entry',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [voucherId, setVoucherId] = useState('');

  useEffect(() => {
    fetch('/api/branches?limit=100')
      .then((res) => res.json())
      .then((json) => {
        const list = json.data || [];
        setBranches(list);
        if (list[0]) setForm((prev) => ({ ...prev, branchId: list[0]._id }));
      })
      .catch(() => setError('Failed to load branches'));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setVoucherId('');
    try {
      const res = await fetch('/api/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cashAmount: Number(form.cashAmount || 0),
          bankAmount: Number(form.bankAmount || 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to post opening balance');
      setVoucherId(json.data?._id || '');
      setMessage('Opening balance posted. Dashboard cash position will now include this baseline.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opening Balances"
        subtitle="Post migrated cash and bank balances before continuing live operations."
        icon={Landmark}
      />

      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">{error}</div>}
      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center justify-between gap-3">
          <span>{message}</span>
          {voucherId && <Link href={`/dashboard/receipts/voucher/${voucherId}`} className="inline-flex items-center gap-1 font-bold text-indigo-600"><Receipt className="w-4 h-4" /> Print Voucher</Link>}
        </div>
      )}

      <CardWrapper className="p-6 max-w-3xl">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Branch</label>
              <select className={inputClass} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.branchName} ({branch.branchCode})</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Opening Date</label>
              <input type="date" className={inputClass} value={form.voucherDate} onChange={(e) => setForm({ ...form, voucherDate: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Cash in Hand Opening Balance</label>
              <input type="number" min="0" step="0.01" className={inputClass} value={form.cashAmount} onChange={(e) => setForm({ ...form, cashAmount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Bank Opening Balance</label>
              <input type="number" min="0" step="0.01" className={inputClass} value={form.bankAmount} onChange={(e) => setForm({ ...form, bankAmount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Narration</label>
              <input className={inputClass} value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} />
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            This creates a balanced journal voucher: debit Cash/Bank and credit Opening Balance Equity. Post it once per branch for migrated balances.
          </div>

          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">
            <Save className="w-4 h-4" /> {loading ? 'Posting...' : 'Post Opening Balance'}
          </button>
        </form>
      </CardWrapper>
    </div>
  );
}
