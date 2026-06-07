'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  User, 
  MapPin, 
  CreditCard, 
  UserCheck, 
  Briefcase,
  AlertCircle
} from 'lucide-react';

import PageHeader from '@/components/shared/PageHeader.jsx';
import CardWrapper from '@/components/shared/CardWrapper.jsx';
import FormWrapper from '@/components/shared/FormWrapper.jsx';

export default function CreateMemberPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form states
  const [formData, setFormData] = useState({
    branchId: '',
    fullName: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    dateOfBirth: '',
    gender: 'MALE',
    mobile: '',
    alternateMobile: '',
    email: '',
    occupation: '',
    annualIncome: 0,
    aadhaarNumber: '',
    panNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    district: '',
    pincode: '',
    memberCategory: 'general',
    photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
    signatureUrl: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
    remarks: '',
    autoChargeFee: true,
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = value;
    if (type === 'checkbox') {
      finalVal = checked;
    } else if (type === 'number') {
      finalVal = value === '' ? 0 : parseFloat(value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: finalVal,
    }));
    // Clear field error
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
    setLoading(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'VALIDATION_ERROR' && json.error.details) {
          // Normalize zod path errors
          const errors = {};
          Object.keys(json.error.details).forEach((key) => {
            errors[key] = json.error.details[key];
          });
          setFieldErrors(errors);
          throw new Error('Please fix the validation errors on the form.');
        } else {
          throw new Error(json.error?.message || 'Failed to register new member.');
        }
      }

      router.push(`/dashboard/members/${json.data._id}`);
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
          onClick={() => router.push('/dashboard/members')}
          className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-xl cursor-pointer text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <PageHeader
          title="Register New Member"
          subtitle="Add a new member profile to Noble Cooperative Bank. Fields with * are mandatory."
          breadcrumbs={[
            { label: 'Platform Core', href: '/dashboard' },
            { label: 'Members', href: '/dashboard/members' },
            { label: 'Create', href: '#' },
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
        {/* Section 1: Membership Base */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserCheck className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Membership Foundation</h3>
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
                <option value="" disabled>Select Home Branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
              {fieldErrors.branchId && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.branchId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Member Category *
              </label>
              <select
                name="memberCategory"
                value={formData.memberCategory}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              >
                <option value="general">General</option>
                <option value="senior_citizen">Senior Citizen</option>
                <option value="staff">Bank Staff</option>
                <option value="farmer">Farmer</option>
                <option value="business">Business Professional</option>
              </select>
            </div>

            <div className="flex items-center pt-8">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="autoChargeFee"
                  checked={formData.autoChargeFee}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Auto-charge Membership Fee (₹100)
                </span>
              </label>
            </div>
          </div>
        </CardWrapper>

        {/* Section 2: Personal Details */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Personal & Family Profile</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter member's legal name"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {"Father's Name *"}
              </label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                required
                placeholder="Enter father's name"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.fatherName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.fatherName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {"Mother's Name *"}
              </label>
              <input
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                required
                placeholder="Enter mother's name"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.motherName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.motherName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {"Spouse's Name (Optional)"}
              </label>
              <input
                type="text"
                name="spouseName"
                value={formData.spouseName}
                onChange={handleChange}
                placeholder="Enter spouse name"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Date of Birth * (Age &gt;= 18)
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.dateOfBirth && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.dateOfBirth}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Mobile Number *
              </label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                placeholder="10-digit mobile number"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
              {fieldErrors.mobile && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.mobile}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Alternate Mobile (Optional)
              </label>
              <input
                type="text"
                name="alternateMobile"
                value={formData.alternateMobile}
                onChange={handleChange}
                placeholder="Alternative number"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="member@example.com"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
              )}
            </div>
          </div>
        </CardWrapper>

        {/* Section 3: Professional & Financial Details */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Briefcase className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Professional & Financial Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Occupation
              </label>
              <input
                type="text"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="e.g. Salaried, Farmer, Business owner"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Annual Income (₹)
              </label>
              <input
                type="number"
                name="annualIncome"
                value={formData.annualIncome}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
            </div>
          </div>
        </CardWrapper>

        {/* Section 4: National Identifiers */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">National Identifiers (KYC Bases)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Aadhaar Number * (12 digits)
              </label>
              <input
                type="text"
                name="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={handleChange}
                required
                placeholder="12-digit Aadhaar number"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
              {fieldErrors.aadhaarNumber && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.aadhaarNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                PAN Number (Optional)
              </label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
              {fieldErrors.panNumber && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.panNumber}</p>
              )}
            </div>
          </div>
        </CardWrapper>

        {/* Section 5: Address Details */}
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-5 h-5 text-indigo-650" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Residential Address</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Address Line 1 *
              </label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                required
                placeholder="House No, Street name, Area details"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.addressLine1 && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.addressLine1}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Apartment, landmark, block details"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="City"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.city && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                District *
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
                placeholder="District"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.district && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.district}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                placeholder="State"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all"
              />
              {fieldErrors.state && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.state}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Pincode * (6 digits)
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
                placeholder="6-digit pincode"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-550/20 focus:border-indigo-600 transition-all font-mono"
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.pincode}</p>
              )}
            </div>
          </div>
        </CardWrapper>

        {/* Submit action */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/members')}
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
            {loading ? 'Registering...' : 'Register Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
