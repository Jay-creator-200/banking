'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Search, 
  Wallet,
  AlertCircle,
  CheckCircle,
  ArrowUpCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function SavingsWithdrawalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Account search state
  const [accountNoQuery, setAccountNoQuery] = useState('');
  const [account, setAccount] = useState(null);
  const [searchingAccount, setSearchingAccount] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    accountId: '', // MongoDB ID of the account
    amount: 0,
    paymentMode: 'CASH',
    remarks: '',
  });

  const handleSearchAccount = async (e) => {
    e.preventDefault();
    if (!accountNoQuery.trim()) return;

    setSearchingAccount(true);
    setAccount(null);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/savings-accounts?search=${encodeURIComponent(accountNoQuery.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to search account');
      }
      
      const found = json.data?.find(acc => acc.accountNo.toUpperCase() === accountNoQuery.trim().toUpperCase());
      if (!found) {
        throw new Error(`No account found with number "${accountNoQuery.toUpperCase()}"`);
      }
      if (found.status === 'closed') {
        throw new Error(`Account "${found.accountNo}" is CLOSED. Withdrawals are disabled.`);
      }
      if (found.status === 'frozen') {
        throw new Error(`Account "${found.accountNo}" is FROZEN (Reason: ${found.freezeReason || 'Compliance Hold'}). Withdrawals are disabled.`);
      }

      setAccount(found);
      setFormData(prev => ({ ...prev, accountId: found._id }));
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSearchingAccount(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let finalVal = value;
    if (type === 'number') {
      finalVal = value === '' ? 0 : parseFloat(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: finalVal,
    }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountId) {
      setSubmitError('Please look up and select a valid savings account first');
      return;
    }
    if (formData.amount <= 0) {
      setFieldErrors({ amount: 'Amount must be greater than zero' });
      return;
    }

    // Client-side minimum balance check
    if (account.availableBalance - formData.amount < account.minimumBalance) {
      setSubmitError(`Operation blocks: Account leaves less than the required minimum balance of ₹${account.minimumBalance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/savings-accounts/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'VALIDATION_ERROR' && json.error.details) {
          setFieldErrors(json.error.details);
          throw new Error('Please fix the validation errors on the form.');
        } else {
          throw new Error(json.error?.message || 'Failed to create withdrawal request.');
        }
      }

      router.push(`/dashboard/savings-accounts/${account._id}`);
    } catch (err) {
      setSubmitError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/savings-accounts')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-650"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Teller Withdrawal Request"
          subtitle="Process a withdrawal request from a member's savings account. Enters the maker-checker approval queue."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Savings', href: '/dashboard/savings-accounts' },
            { label: 'Withdraw', href: '#' },
          ]}
        />
      </div>

      {submitError && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-450 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Operation Blocked</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* Account lookup card */}
      <CardWrapper className="p-6 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-indigo-650" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Savings Account Lookup</h3>
        </div>

        {!account ? (
          <form onSubmit={handleSearchAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number * (e.g. SAV-2026-000001)</label>
              <input
                type="text"
                value={accountNoQuery}
                onChange={e => setAccountNoQuery(e.target.value)}
                placeholder="Enter SAV account number..."
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={searchingAccount}
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
            >
              {searchingAccount ? 'Searching...' : 'Search Account'}
            </button>
          </form>
        ) : (
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-650" />
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{account.accountNo} ({account.accountType?.toUpperCase()})</p>
                <p className="text-xs text-slate-550 font-mono">
                  Member: {account.memberId?.fullName} • Home Branch: {account.branchId?.branchName} • Spendable Available: ₹{account.availableBalance?.toLocaleString()} (Min Req: ₹{account.minimumBalance})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setAccount(null); setFormData(prev => ({ ...prev, accountId: '' })); }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              Change Account
            </button>
          </div>
        )}
      </CardWrapper>

      {/* Account status alerts */}
      {account && account.status === 'dormant' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-700 dark:text-amber-450 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold">Account is Dormant</p>
            <p className="mt-0.5">To lift dormancy, make sure to add &quot;Reactivate and withdraw&quot; in the Narration remarks below. Otherwise, the transaction request will fail validation.</p>
          </div>
        </div>
      )}

      {/* Withdrawal details form */}
      {account && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardWrapper className="p-6 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ArrowUpCircle className="w-5 h-5 text-indigo-650" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Withdrawal Ticket Specifications</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Withdrawal Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="Enter amount to withdraw..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
                />
                {fieldErrors.amount && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Payment Mode *</label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
                >
                  <option value="CASH">Cash Withdrawal</option>
                  <option value="TRANSFER">Transfer Voucher</option>
                  <option value="CHEQUE">Cheque Withdrawal</option>
                  <option value="UPI">UPI Withdrawal</option>
                </select>
              </div>

              <div className="flex items-center pt-8">
                {formData.amount > 50000 && (
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3.5 py-2 rounded-xl border border-rose-250 dark:border-rose-900/40 text-[11px] font-bold">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Requires Manager Approval (&gt; ₹50k)</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Narration Remarks / Remarks *</label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  required={account.status === 'dormant'}
                  placeholder={account.status === 'dormant' ? 'Write "Reactivate and withdraw" here...' : 'Narrate transaction remarks...'}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          </CardWrapper>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/savings-accounts')}
              className="px-6 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Post Withdrawal'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
