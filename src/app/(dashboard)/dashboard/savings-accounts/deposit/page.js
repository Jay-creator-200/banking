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
  ArrowDownCircle
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function SavingsDepositPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Account search state
  const [accountNoQuery, setAccountNoQuery] = useState('');
  const [account, setAccount] = useState(null);
  const [searchingAccount, setSearchingAccount] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    accountId: '', // MongoDB ID of the account
    amount: 0,
    paymentMode: 'CASH',
    referenceNo: '',
    remarks: '',
  });

  const handleSearchAccount = async (e) => {
    if (e) e.preventDefault();
    if (!accountNoQuery.trim()) return;

    setSearchingAccount(true);
    setSearchResults([]);
    setAccount(null);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/savings-accounts?search=${encodeURIComponent(accountNoQuery.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to search account');
      }
      
      const docs = json.data || [];
      setSearchResults(docs);
      
      // If exactly 1 active account is found, auto-select it
      if (docs.length === 1 && docs[0].status?.toLowerCase() === 'active') {
        const found = docs[0];
        setAccount(found);
        setFormData(prev => ({ ...prev, accountId: found._id }));
        setSearchResults([]);
      } else if (docs.length === 0) {
        throw new Error(`No account found matching "${accountNoQuery}"`);
      }
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSearchingAccount(false);
    }
  };

  const handleSelectAccount = (acc) => {
    if (acc.status?.toLowerCase() !== 'active') {
      setSubmitError(`Account "${acc.accountNo}" is currently "${acc.status}". Deposits are only allowed on active accounts.`);
      return;
    }
    setAccount(acc);
    setFormData(prev => ({ ...prev, accountId: acc._id }));
    setSearchResults([]);
    setSubmitError(null);
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
      setSubmitError('Please look up and select a valid active savings account first');
      return;
    }
    if (formData.amount <= 0) {
      setFieldErrors({ amount: 'Amount must be greater than zero' });
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/savings-accounts/deposit', {
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
          throw new Error(json.error?.message || 'Failed to create deposit request.');
        }
      }

      // Route to account hub summary after queuing deposit request
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
          title="Teller Deposit slip"
          subtitle="Deposit funds into a member's savings account. Enters the maker-checker approval queue."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Savings', href: '/dashboard/savings-accounts' },
            { label: 'Deposit', href: '#' },
          ]}
        />
      </div>

      {submitError && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-450 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Operation Error</p>
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
          <div className="space-y-4">
            <form onSubmit={handleSearchAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Search by Account No, Member Name, or Mobile *</label>
                <input
                  type="text"
                  value={accountNoQuery}
                  onChange={e => setAccountNoQuery(e.target.value)}
                  placeholder="Type name, mobile number, or SAV account number..."
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

            {searchResults.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900 shadow-sm max-h-60 overflow-y-auto">
                <p className="p-3 text-[10px] font-bold text-slate-450 uppercase bg-slate-50/50 dark:bg-slate-900/30">Select Matching Account</p>
                {searchResults.map((acc) => (
                  <button
                    key={acc._id}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className="w-full text-left p-3.5 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{acc.accountNo} ({acc.accountType?.toUpperCase()})</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Member: <span className="font-semibold text-slate-700 dark:text-slate-350">{acc.memberId?.fullName}</span> • Mobile: {acc.memberId?.mobile || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-600 font-mono">₹{acc.currentBalance?.toLocaleString('en-IN')}</p>
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md mt-1 ${
                        acc.status?.toLowerCase() === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450' 
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450'
                      }`}>
                        {acc.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-650" />
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{account.accountNo} ({account.accountType?.toUpperCase()})</p>
                <p className="text-xs text-slate-550 font-mono">
                  Member: {account.memberId?.fullName} • Home Branch: {account.branchId?.branchName} • Ledger Balance: ₹{account.currentBalance?.toLocaleString()}
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

      {/* Deposit details form */}
      {account && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardWrapper className="p-6 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ArrowDownCircle className="w-5 h-5 text-indigo-650" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Deposit Slip Specifications</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Deposit Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="Enter amount to deposit..."
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
                  <option value="CASH">Cash Deposit</option>
                  <option value="TRANSFER">Transfer Voucher</option>
                  <option value="CHEQUE">Cheque Clearance</option>
                  <option value="UPI">UPI Transaction</option>
                  <option value="RTGS">RTGS</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reference No / Slip No</label>
                <input
                  type="text"
                  name="referenceNo"
                  value={formData.referenceNo}
                  onChange={handleChange}
                  placeholder="e.g. UPI Ref / Slip No..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Narration Remarks</label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Narrate transaction details..."
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
              {loading ? 'Submitting...' : 'Post Deposit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
