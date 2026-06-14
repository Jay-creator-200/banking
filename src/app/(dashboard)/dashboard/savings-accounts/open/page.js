'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Wallet,
  AlertCircle,
  Search,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';

export default function OpenSavingsAccountPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Member Search State
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    memberId: '',
    branchId: '',
    accountType: 'regular',
    openingDeposit: 0,
    paymentMode: 'CASH',
    interestRate: 4.0,
    minimumBalance: 1000,
  });

  // Fetch branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches?limit=100');
        if (res.ok) {
          const json = await res.json();
          setBranches(json.data || []);
          if (json.data && json.data.length > 0) {
            setFormData(prev => ({ ...prev, branchId: json.data[0]._id }));
          }
        }
      } catch (e) {
        console.error('Failed to load branches:', e);
      }
    }
    loadBranches();
  }, []);

  // Update rates/minimum balances when account type changes
  useEffect(() => {
    let minBal = 1000;
    let rate = 4.0;

    if (formData.accountType === 'staff') {
      minBal = 0;
      rate = 5.5;
    } else if (formData.accountType === 'senior_citizen') {
      minBal = 500;
      rate = 4.5;
    }

    setFormData(prev => ({
      ...prev,
      minimumBalance: minBal,
      interestRate: rate
    }));
  }, [formData.accountType]);

  // Auto-select member if memberId query parameter is provided in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const memberIdParam = params.get('memberId');
      if (memberIdParam) {
        async function fetchPreselectedMember() {
          try {
            const res = await fetch(`/api/members/${memberIdParam}`);
            if (res.ok) {
              const json = await res.json();
              if (json.data) {
                setSelectedMember(json.data);
                setFormData(prev => ({ ...prev, memberId: json.data._id }));
              }
            }
          } catch (e) {
            console.error('Failed to fetch preselected member:', e);
          }
        }
        fetchPreselectedMember();
      }
    }
  }, []);

  // Search Members
  useEffect(() => {
    if (memberSearch.trim().length < 2) {
      setMemberResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const res = await fetch(`/api/members?memberStatus=active&search=${encodeURIComponent(memberSearch)}`);
        if (res.ok) {
          const json = await res.json();
          setMemberResults(json.data || []);
        }
      } catch (e) {
        console.error('Failed to search members:', e);
      } finally {
        setSearchingMembers(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [memberSearch]);

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

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setFormData(prev => ({ ...prev, memberId: member._id }));
    setMemberResults([]);
    setMemberSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.memberId) {
      setSubmitError('Please select a member first');
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/savings-accounts/open', {
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
          throw new Error(json.error?.message || 'Failed to open savings account.');
        }
      }

      router.push(`/dashboard/savings-accounts/${json.data._id}`);
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
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Open Savings Account"
          subtitle="Open a new savings account for verified, active members of Noble Cooperative Bank."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Savings', href: '/dashboard/savings-accounts' },
            { label: 'Open', href: '#' },
          ]}
        />
      </div>

      {submitError && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-450 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Form Submission Failed</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Member Lookup */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Select Member</h3>
          </div>

          {!selectedMember ? (
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Search Active Member (Name / Mobile / Number) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Type member name, number, or mobile..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              {searchingMembers && (
                <p className="text-xs text-indigo-600 mt-2 animate-pulse">Searching active bank members...</p>
              )}

              {memberResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                  {memberResults.map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.fullName}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          No: {m.memberNo} • Mobile: {m.mobile}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                        {m.kycStatus}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{selectedMember.fullName}</p>
                  <p className="text-xs text-slate-550 font-mono">
                    Member No: {selectedMember.memberNo} • Mobile: {selectedMember.mobile} • Category: {selectedMember.memberCategory?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                Change Member
              </button>
            </div>
          )}
        </CardWrapper>

        {/* Section 2: Account Specifications */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Wallet className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Account Specifications</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Home Branch *
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              >
                <option value="" disabled>Select Branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Savings Account Type *
              </label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              >
                <option value="regular">Regular Savings</option>
                <option value="staff">Staff Savings</option>
                <option value="senior_citizen">Senior Citizen Savings</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Annual Interest Rate (% p.a.) *
              </label>
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleChange}
                step="0.05"
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
              {fieldErrors.interestRate && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.interestRate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Minimum Balance Requirement (₹) *
              </label>
              <input
                type="number"
                name="minimumBalance"
                value={formData.minimumBalance}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
              {fieldErrors.minimumBalance && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.minimumBalance}</p>
              )}
            </div>
          </div>
        </CardWrapper>

        {/* Section 3: Opening Deposit */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Wallet className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Opening Deposit (Optional)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Deposit Amount (₹)
              </label>
              <input
                type="number"
                name="openingDeposit"
                value={formData.openingDeposit}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
            </div>

            {formData.openingDeposit > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Payment Mode *
                </label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
                >
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Transfer Voucher</option>
                  <option value="CHEQUE">Cheque Clearance</option>
                  <option value="UPI">UPI Payment</option>
                </select>
              </div>
            )}
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
            disabled={loading || !formData.memberId}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-650/15 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Opening Account...' : 'Open Savings Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
