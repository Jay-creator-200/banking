'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  CreditCard, 
  Users, 
  FileText, 
  PieChart, 
  DollarSign, 
  History, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash, 
  Star, 
  Upload, 
  ShieldAlert,
  Edit,
  Save,
  Check,
  X,
  AlertTriangle,
  PiggyBank,
  CalendarClock,
  TrendingUp,
  Coins
} from 'lucide-react';

import CardWrapper from '@/components/shared/CardWrapper.jsx';
import PageHeader from '@/components/shared/PageHeader.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return age;
}

function formatMemberCategory(category) {
  const labels = {
    general: 'General',
    obc: 'OBC',
    sc: 'SC',
    st: 'ST',
  };
  return labels[category] || 'General';
}

export default function MemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  // Edit details state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [detailsError, setDetailsError] = useState(null);

  // Status/KYC Dialog states
  const [kycStatusOpen, setKycStatusOpen] = useState(false);
  const [kycStatusForm, setKycStatusForm] = useState({ status: 'verified', remarks: '' });
  const [kycError, setKycError] = useState(null);

  const [lifecycleStatusOpen, setLifecycleStatusOpen] = useState(false);
  const [lifecycleStatusForm, setLifecycleStatusForm] = useState({ status: 'active', remarks: '' });
  const [lifecycleError, setLifecycleError] = useState(null);

  // Nominees tab state
  const [nominees, setNominees] = useState([]);
  const [isEditingNominees, setIsEditingNominees] = useState(false);
  const [nomineesForm, setNomineesForm] = useState([]);
  const [nomineeError, setNomineeError] = useState(null);

  // Documents tab state
  const [documents, setDocuments] = useState([]);
  const [uploadForm, setUploadForm] = useState({ documentType: 'aadhaar', documentName: '', file: null });
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [docError, setDocError] = useState(null);

  // Share Capital tab state
  const [sharesLedger, setSharesLedger] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [sharePurchaseOpen, setSharePurchaseOpen] = useState(false);
  const [sharePurchaseForm, setSharePurchaseForm] = useState({ sharesPurchased: 10, shareValue: 10, paymentMode: 'CASH' });
  const [shareError, setShareError] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);

  // Membership fee states
  const [feeTransactions, setFeeTransactions] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);

  // Audit Logs states
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Savings Accounts tab state
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [savingsLoading, setSavingsLoading] = useState(false);

  // Loans tab state
  const [loans, setLoans] = useState([]);
  const [loanApplications, setLoanApplications] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);

  // Deposits tab state
  const [deposits, setDeposits] = useState({ rd: [], fd: [], dds: [], mis: [] });
  const [depositsLoading, setDepositsLoading] = useState(false);

  // Fetch all primary member details
  const fetchMemberDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Member
      const memberRes = await fetch(`/api/members/${id}`);
      if (memberRes.ok) {
        const json = await memberRes.json();
        setMember(json.data);
        setEditFormData(json.data);
      } else {
        throw new Error('Failed to load member profile');
      }

      // 2. Fetch Branches for edit dropdown
      const branchRes = await fetch('/api/branches?limit=100');
      if (branchRes.ok) {
        const json = await branchRes.json();
        setBranches(json.data || []);
      }

      // 3. Fetch documents early so the hero can show a passport photo if uploaded.
      const docsRes = await fetch(`/api/member-documents?memberId=${id}`);
      if (docsRes.ok) {
        const json = await docsRes.json();
        setDocuments(json.data || []);
      }
    } catch (e) {
      console.error(e);
      setDetailsError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMemberDetails();
  }, [fetchMemberDetails]);

  // Load nominees
  const fetchNominees = useCallback(async () => {
    try {
      const res = await fetch(`/api/member-nominees?memberId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setNominees(json.data || []);
        setNomineesForm(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load nominees:', e);
    }
  }, [id]);

  // Load documents
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/member-documents?memberId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  }, [id]);

  // Load share records
  const fetchShares = useCallback(async () => {
    try {
      const lRes = await fetch(`/api/share-ledger?memberId=${id}`);
      const cRes = await fetch(`/api/share-certificates?memberId=${id}`);
      if (lRes.ok && cRes.ok) {
        const lJson = await lRes.json();
        const cJson = await cRes.json();
        setSharesLedger(lJson.data || []);
        setCertificates(cJson.data || []);
      }
    } catch (e) {
      console.error('Failed to load share capital metrics:', e);
    }
  }, [id]);

  // Load fee history
  const fetchFees = useCallback(async () => {
    setFeeLoading(true);
    try {
      const res = await fetch(`/api/member-reports?reportType=membership-fees`);
      if (res.ok) {
        const json = await res.json();
        // filter client-side for member ID
        const matched = (json.data?.transactions || []).filter(t => t.memberId?._id === id);
        setFeeTransactions(matched);
      }
    } catch (e) {
      console.error('Failed to load membership fee audits:', e);
    } finally {
      setFeeLoading(false);
    }
  }, [id]);

  // Load audit trail
  const fetchAudits = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?referenceId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load audits:', e);
    } finally {
      setAuditLoading(false);
    }
  }, [id]);

  // Load savings accounts
  const fetchSavingsAccounts = useCallback(async () => {
    setSavingsLoading(true);
    try {
      const res = await fetch(`/api/savings-accounts?memberId=${id}`);
      if (res.ok) {
        const json = await res.json();
        setSavingsAccounts(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load savings accounts:', e);
    } finally {
      setSavingsLoading(false);
    }
  }, [id]);

  // Load loans and applications
  const fetchLoansAndApplications = useCallback(async () => {
    setLoansLoading(true);
    try {
      const loansRes = await fetch(`/api/loans?memberId=${id}`);
      const appsRes = await fetch(`/api/loan-applications?memberId=${id}`);
      if (loansRes.ok && appsRes.ok) {
        const loansJson = await loansRes.json();
        const appsJson = await appsRes.json();
        setLoans(loansJson.data || []);
        setLoanApplications(appsJson.data || []);
      }
    } catch (e) {
      console.error('Failed to load loans and applications:', e);
    } finally {
      setLoansLoading(false);
    }
  }, [id]);

  // Load deposit accounts for this member
  const fetchDeposits = useCallback(async () => {
    setDepositsLoading(true);
    try {
      const [rdRes, fdRes, ddsRes, misRes] = await Promise.all([
        fetch(`/api/rd-accounts?memberId=${id}&limit=20`),
        fetch(`/api/fd-accounts?memberId=${id}&limit=20`),
        fetch(`/api/dds-accounts?memberId=${id}&limit=20`),
        fetch(`/api/mis-accounts?memberId=${id}&limit=20`),
      ]);
      const [rdJson, fdJson, ddsJson, misJson] = await Promise.all([rdRes.json(), fdRes.json(), ddsRes.json(), misRes.json()]);
      setDeposits({
        rd: rdJson.data || [],
        fd: fdJson.data || [],
        dds: ddsJson.data || [],
        mis: misJson.data || [],
      });
    } catch (e) {
      console.error('Failed to load deposit accounts:', e);
    } finally {
      setDepositsLoading(false);
    }
  }, [id]);

  // Handle Tab Switch Actions
  useEffect(() => {
    if (activeTab === 'nominees') fetchNominees();
    if (activeTab === 'documents') fetchDocuments();
    if (activeTab === 'shares') fetchShares();
    if (activeTab === 'fees') fetchFees();
    if (activeTab === 'accounts') fetchSavingsAccounts();
    if (activeTab === 'loans') fetchLoansAndApplications();
    if (activeTab === 'audit') fetchAudits();
    if (activeTab === 'deposits') fetchDeposits();
  }, [activeTab, fetchNominees, fetchDocuments, fetchShares, fetchFees, fetchSavingsAccounts, fetchLoansAndApplications, fetchAudits, fetchDeposits]);

  // Update Member Demographics
  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setDetailsError(null);
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update demographics');
      }
      setMember(json.data);
      setIsEditingDetails(false);
    } catch (err) {
      setDetailsError(err.message);
    }
  };

  // Perform KYC verify/reject status post
  const handleKycStatusSubmit = async (e) => {
    e.preventDefault();
    setKycError(null);
    try {
      const res = await fetch(`/api/members/${id}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kycStatusForm),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to verify KYC');
      }
      setMember(json.data);
      setKycStatusOpen(false);
      setKycStatusForm({ status: 'verified', remarks: '' });
      fetchAudits();
    } catch (err) {
      setKycError(err.message);
    }
  };

  // Perform Account Lifecycle transition post
  const handleLifecycleStatusSubmit = async (e) => {
    e.preventDefault();
    setLifecycleError(null);
    try {
      const res = await fetch(`/api/members/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lifecycleStatusForm),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update lifecycle status');
      }
      setMember(json.data);
      setLifecycleStatusOpen(false);
      setLifecycleStatusForm({ status: 'active', remarks: '' });
      fetchAudits();
    } catch (err) {
      setLifecycleError(err.message);
    }
  };

  // Nominee Operations
  const handleAddNomineeField = () => {
    setNomineesForm([
      ...nomineesForm,
      { fullName: '', relationship: '', dateOfBirth: '', mobile: '', aadhaarNumber: '', address: '', sharePercentage: 0, isPrimary: false }
    ]);
  };

  const handleRemoveNomineeField = (index) => {
    setNomineesForm(nomineesForm.filter((_, i) => i !== index));
  };

  const handleNomineeFieldChange = (index, field, value) => {
    const updated = [...nomineesForm];
    if (field === 'isPrimary' && value === true) {
      // Clear other primary checkboxes
      updated.forEach((nom, idx) => {
        updated[idx].isPrimary = idx === index;
      });
    } else {
      updated[index][field] = value;
    }
    setNomineesForm(updated);
  };

  const handleSaveNominees = async () => {
    setNomineeError(null);
    try {
      const res = await fetch('/api/member-nominees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: id, nominees: nomineesForm }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to save nominee configurations');
      }
      setNominees(json.data);
      setIsEditingNominees(false);
      fetchAudits();
    } catch (err) {
      setNomineeError(err.message);
    }
  };

  // Document upload operations
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setDocError('Please select a file to upload');
      return;
    }
    setDocUploadLoading(true);
    setDocError(null);

    try {
      const form = new FormData();
      form.append('file', uploadForm.file);
      form.append('memberId', id);
      form.append('documentType', uploadForm.documentType);
      form.append('documentName', uploadForm.documentName || uploadForm.documentType.toUpperCase());

      const res = await fetch('/api/member-documents', {
        method: 'POST',
        body: form
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to upload document');
      }
      setDocuments([...documents, json.data]);
      setUploadForm({ documentType: 'aadhaar', documentName: '', file: null });
      fetchAudits();
    } catch (err) {
      setDocError(err.message);
    } finally {
      setDocUploadLoading(false);
    }
  };

  // Document verification operations
  const handleVerifyDocument = async (docId, status) => {
    try {
      const res = await fetch(`/api/member-documents/${docId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks: `Document marked as ${status} by auditor.` }),
      });
      if (res.ok) {
        fetchDocuments();
        fetchAudits();
      }
    } catch (e) {
      console.error('Failed to verify document:', e);
    }
  };

  // Share purchase submission
  const handlePurchaseShares = async (e) => {
    e.preventDefault();
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch('/api/share-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: id,
          sharesPurchased: parseInt(sharePurchaseForm.sharesPurchased),
          shareValue: parseFloat(sharePurchaseForm.shareValue),
          paymentMode: sharePurchaseForm.paymentMode
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to dispatch share purchase request');
      }
      setSharePurchaseOpen(false);
      fetchShares();
      fetchAudits();
      alert('Share purchase transaction posted and queued for checker approval!');
    } catch (err) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-950 dark:text-white">Member Profile Not Found</h3>
        <p className="text-xs text-slate-400">The requested cooperative member could not be loaded.</p>
        <button onClick={() => router.push('/dashboard/members')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 text-white rounded-xl text-xs font-bold cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to directory
        </button>
      </div>
    );
  }

  const memberAge = calculateAge(member.dateOfBirth);
  const uploadedPhoto = documents
    .filter((doc) => doc.documentType === 'photo' && doc.cloudinaryUrl)
    .sort((a, b) => {
      const statusWeight = (doc) => (doc.verificationStatus === 'verified' ? 1 : 0);
      const statusDiff = statusWeight(b) - statusWeight(a);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0);
    })[0];
  const profilePhotoUrl = uploadedPhoto?.cloudinaryUrl || member.photoUrl;

  return (
    <div className="space-y-6">
      {/* Top action header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/members')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-650 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 rounded-xl transition-all text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        <div className="flex gap-2.5">
          <button
            onClick={() => setKycStatusOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-50 transition-all text-xs font-bold rounded-xl cursor-pointer"
          >
            Audit KYC Status
          </button>
          <button
            onClick={() => setLifecycleStatusOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white transition-all text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-650/15"
          >
            Modify Account Status
          </button>
        </div>
      </div>

      {/* Member Hero Summary Block */}
      <CardWrapper className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            {profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePhotoUrl}
                alt={`${member.fullName} passport photo`}
                className="w-14 h-14 rounded-2xl object-cover shadow-inner border border-indigo-100 dark:border-indigo-900/20 bg-slate-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xl uppercase shadow-inner border border-indigo-100 dark:border-indigo-900/20">
                {member.fullName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{member.fullName}</h2>
                <span className="font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/10">
                  {member.memberNo}
                </span>
              </div>
              <p className="text-xs text-slate-450 dark:text-slate-500 font-mono mt-1">
                Age: <span className="font-bold text-slate-750 dark:text-slate-350">{memberAge !== null ? `${memberAge} years` : 'N/A'}</span> • 
                Contact: <span className="font-bold">{member.mobile || 'N/A'}</span> • 
                Registered: <span className="font-bold">{new Date(member.membershipDate || member.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">KYC Status</span>
              <StatusBadge status={member.kycStatus} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Account Status</span>
              <StatusBadge status={member.memberStatus} />
            </div>
          </div>
        </div>
      </CardWrapper>

      {/* Profile detail Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
        {[
          { id: 'details', label: 'Basic Profile', icon: User },
          { id: 'nominees', label: 'Nominee Allocations', icon: Users },
          { id: 'documents', label: 'KYC Documents', icon: FileText },
          { id: 'shares', label: 'Share Capital', icon: PieChart },
          { id: 'fees', label: 'Registration Fees', icon: DollarSign },
          { id: 'accounts', label: 'Savings & Current', icon: CheckCircle },
          { id: 'loans', label: 'Loans & Schemes', icon: AlertTriangle },
          { id: 'deposits', label: 'Deposits', icon: PiggyBank },
          { id: 'audit', label: 'Audit History', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4.5 py-3 text-xs font-bold border-b-2 cursor-pointer transition-all whitespace-nowrap outline-none ${
                isSelected 
                  ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT MODULES */}

      {/* 1. Basic Profile Tab */}
      {activeTab === 'details' && (
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-650" />
              Demographic Profile
            </h3>
            <button
              onClick={() => {
                setIsEditingDetails(!isEditingDetails);
                setEditFormData(member);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 cursor-pointer"
            >
              {isEditingDetails ? <X className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
              {isEditingDetails ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {detailsError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {detailsError}
            </div>
          )}

          {!isEditingDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{member.fullName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{"Father's Name"}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.fatherName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{"Mother's Name"}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.motherName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{"Spouse's Name"}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.spouseName || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date of Birth</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{new Date(member.dateOfBirth).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Age</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{memberAge !== null ? `${memberAge} years` : 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gender</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.gender}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mobile Number</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{member.mobile}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alternate Contact</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">{member.alternateMobile || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email ID</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.email || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Occupation</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.occupation || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Annual Income</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">₹{(member.annualIncome || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Home Branch</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.branchId?.branchName || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Member Category</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatMemberCategory(member.memberCategory)}</span>
              </div>
              <div className="md:col-span-3 pb-3 border-b border-slate-100 dark:border-slate-800/60"></div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Other Bank</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.otherBankName || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bank Branch</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{member.otherBankBranch || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Other Account No</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">{member.otherBankAccountNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">IFSC Code</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">{member.otherBankIfscCode || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">UPI ID</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">{member.upiId || 'N/A'}</span>
              </div>
              <div className="md:col-span-3 pb-3 border-b border-slate-100 dark:border-slate-800/60"></div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Aadhaar Number</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">XXXX-XXXX-{member.aadhaarNumber.slice(-4)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">PAN Number</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{member.panNumber || 'N/A'}</span>
              </div>
              <div className="md:col-span-3 pb-3 border-b border-slate-100 dark:border-slate-800/60"></div>
              <div className="md:col-span-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Permanent Address</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed mt-1">
                  {member.addressLine1}, {member.addressLine2 && `${member.addressLine2}, `}
                  {member.city}, {member.district}, {member.state} - {member.pincode}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateDetails} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{"Father's Name"}</label>
                  <input
                    type="text"
                    value={editFormData.fatherName}
                    onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{"Mother's Name"}</label>
                  <input
                    type="text"
                    value={editFormData.motherName}
                    onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editFormData.dateOfBirth?.slice(0, 10)}
                    onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Mobile</label>
                  <input
                    type="text"
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Occupation</label>
                  <input
                    type="text"
                    value={editFormData.occupation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Annual Income</label>
                  <input
                    type="number"
                    value={editFormData.annualIncome || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, annualIncome: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Member Category</label>
                  <select
                    value={editFormData.memberCategory || 'general'}
                    onChange={(e) => setEditFormData({ ...editFormData, memberCategory: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  >
                    <option value="general">General</option>
                    <option value="obc">OBC</option>
                    <option value="sc">SC</option>
                    <option value="st">ST</option>
                  </select>
                </div>
                <div className="md:col-span-3 pb-3 border-b border-slate-100 dark:border-slate-800/60"></div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Other Bank Name</label>
                  <input
                    type="text"
                    value={editFormData.otherBankName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, otherBankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Other Bank Branch</label>
                  <input
                    type="text"
                    value={editFormData.otherBankBranch || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, otherBankBranch: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Other Account Number</label>
                  <input
                    type="text"
                    value={editFormData.otherBankAccountNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, otherBankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={editFormData.otherBankIfscCode || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, otherBankIfscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={editFormData.upiId || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, upiId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
                <div className="md:col-span-3 pb-3 border-b border-slate-100 dark:border-slate-800/60"></div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Aadhaar</label>
                  <input
                    type="text"
                    value={editFormData.aadhaarNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, aadhaarNumber: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">PAN</label>
                  <input
                    type="text"
                    value={editFormData.panNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, panNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
                <div className="md:col-span-3 pb-3 border-b border-slate-100 dark:border-slate-800/60"></div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={editFormData.addressLine1}
                    onChange={(e) => setEditFormData({ ...editFormData, addressLine1: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={editFormData.addressLine2 || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, addressLine2: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">District</label>
                  <input
                    type="text"
                    value={editFormData.district}
                    onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">State</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </CardWrapper>
      )}

      {/* 2. Nominee Allocations Tab */}
      {activeTab === 'nominees' && (
        <CardWrapper className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-650" />
              Nominees Registry
            </h3>
            {!isEditingNominees ? (
              <button
                onClick={() => {
                  setIsEditingNominees(true);
                  setNomineesForm(nominees.length > 0 ? nominees : [{ fullName: '', relationship: '', dateOfBirth: '', mobile: '', aadhaarNumber: '', address: '', sharePercentage: 100, isPrimary: true }]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                Manage Nominees
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleAddNomineeField}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Nominee
                </button>
                <button
                  onClick={() => setIsEditingNominees(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {nomineeError && (
            <div className="p-3.5 bg-rose-50 border border-rose-250 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {nomineeError}
            </div>
          )}

          {!isEditingNominees ? (
            nominees.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">No Nominees Configured</p>
                <p className="text-[10px] text-slate-400 mt-1">Provide at least one primary nominee representing 100% share allocation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nominees.map((nom, idx) => (
                  <div key={nom._id || idx} className="p-4 border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl relative space-y-2">
                    {nom.isPrimary && (
                      <span className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[9px] font-extrabold uppercase rounded-full">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Primary Nominee
                      </span>
                    )}
                    <div>
                      <p className="font-extrabold text-sm text-slate-850 dark:text-slate-150">{nom.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{nom.relationship} • DOB: {new Date(nom.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Share Allocation</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm">{nom.sharePercentage}%</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Mobile</span>
                        <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">{nom.mobile || 'N/A'}</span>
                      </div>
                    </div>
                    {nom.address && (
                      <div className="text-[10px] border-t border-slate-100 dark:border-slate-850 pt-2 text-slate-500">
                        <span className="font-bold">Address:</span> {nom.address}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-6">
              {nomineesForm.map((nom, idx) => (
                <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl relative space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800">Nominee Line #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNomineeField(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        value={nom.fullName}
                        onChange={(e) => handleNomineeFieldChange(idx, 'fullName', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                        placeholder="Nominee Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Relationship</label>
                      <input
                        type="text"
                        value={nom.relationship}
                        onChange={(e) => handleNomineeFieldChange(idx, 'relationship', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                        placeholder="e.g. Spouse, Son, Daughter"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={nom.dateOfBirth?.slice(0, 10)}
                        onChange={(e) => handleNomineeFieldChange(idx, 'dateOfBirth', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Share Percentage (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={nom.sharePercentage}
                        onChange={(e) => handleNomineeFieldChange(idx, 'sharePercentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Mobile</label>
                      <input
                        type="text"
                        value={nom.mobile || ''}
                        onChange={(e) => handleNomineeFieldChange(idx, 'mobile', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        placeholder="10 digit number"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Aadhaar (Optional)</label>
                      <input
                        type="text"
                        value={nom.aadhaarNumber || ''}
                        onChange={(e) => handleNomineeFieldChange(idx, 'aadhaarNumber', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                        placeholder="12 digits"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Address</label>
                      <input
                        type="text"
                        value={nom.address || ''}
                        onChange={(e) => handleNomineeFieldChange(idx, 'address', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg"
                        placeholder="Full permanent residential address"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={nom.isPrimary}
                          onChange={(e) => handleNomineeFieldChange(idx, 'isPrimary', e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-650 rounded border-slate-350"
                        />
                        Mark Primary Nominee
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingNominees(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNominees}
                  className="px-4 py-2 bg-indigo-650 text-white hover:bg-indigo-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Nominee Config
                </button>
              </div>
            </div>
          )}
        </CardWrapper>
      )}

      {/* 3. KYC Documents Tab */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardWrapper className="p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
                KYC Document Logs
              </h3>

              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">No KYC Documents Linked</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {documents.map((doc) => (
                    <div key={doc._id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{doc.documentName}</p>
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            {doc.documentType}
                          </span>
                        </div>
                        <a
                          href={doc.cloudinaryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold block mt-1"
                        >
                          View Uploaded File Link
                        </a>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <StatusBadge status={doc.verificationStatus} />

                        {doc.verificationStatus === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleVerifyDocument(doc._id, 'verified')}
                              className="p-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200 dark:border-emerald-900/20 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                              title="Verify"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleVerifyDocument(doc._id, 'rejected')}
                              className="p-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 border border-rose-200 dark:border-rose-900/20 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardWrapper>
          </div>

          <div>
            <CardWrapper className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                Upload Document
              </h3>

              {docError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">
                  {docError}
                </div>
              )}

              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Document Type</label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="photo">Passport Photo</option>
                    <option value="signature">Member Signature</option>
                    <option value="address_proof">Address Proof</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={uploadForm.documentName}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl"
                    placeholder="e.g. Aadhaar Card Front"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Select File (PDF, JPG, PNG)</label>
                  <input
                    type="file"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={docUploadLoading}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {docUploadLoading ? 'Uploading...' : 'Upload File'}
                </button>
              </form>
            </CardWrapper>
          </div>
        </div>
      )}

      {/* 4. Share Capital Tab */}
      {activeTab === 'shares' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Share Certificates & Ledgers
            </h3>
            <button
              onClick={() => setSharePurchaseOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Purchase Shares
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Share Certificate Registry */}
            <CardWrapper className="p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                Share Certificate Register
              </h4>
              {certificates.length === 0 ? (
                <p className="text-xs text-slate-450 dark:text-slate-500 py-6 text-center">No certificates issued.</p>
              ) : (
                <div className="space-y-3">
                  {certificates.map((c) => (
                    <div key={c._id} className="p-3 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-xs text-slate-850 dark:text-slate-200">{c.certificateNo}</p>
                        <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                          Shares: {c.sharesIssued} • Value: ₹{c.shareValue} • Issued: {new Date(c.issuedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardWrapper>

            {/* Share Ledger Logs */}
            <CardWrapper className="p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                Share ledger postings
              </h4>
              {sharesLedger.length === 0 ? (
                <p className="text-xs text-slate-450 dark:text-slate-500 py-6 text-center">No share purchase logs available.</p>
              ) : (
                <div className="space-y-3">
                  {sharesLedger.map((l) => (
                    <div key={l._id} className="p-3 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">{l.sharesPurchased} Shares Purchased</p>
                        <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                          Amount: ₹{l.totalAmount} • Date: {new Date(l.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardWrapper>
          </div>
        </div>
      )}

      {/* 5. Registration Fees Tab */}
      {activeTab === 'fees' && (
        <CardWrapper className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
            Membership Fee Audits
          </h3>

          {feeLoading ? (
            <div className="py-10 text-center"><LoadingSpinner size="sm" /></div>
          ) : feeTransactions.length === 0 ? (
            <div className="text-center py-10">
              <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">No Membership Fee Records Found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeTransactions.map((tx) => (
                <div key={tx._id} className="p-4 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{tx.transactionNo || 'PENDING ASSIGNMENT'}</p>
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-600 font-mono">
                        {tx.paymentMode}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">{tx.narration}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">Created: {new Date(tx.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">₹{tx.amount}.00</span>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardWrapper>
      )}

      {/* 6. Savings & Current Accounts */}
      {activeTab === 'accounts' && (
        <CardWrapper className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-indigo-650" />
              Savings & Deposits Accounts
            </h3>
            <button
              onClick={() => router.push(`/dashboard/savings-accounts/open?memberId=${id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-650/15"
            >
              <Plus className="w-3.5 h-3.5" />
              Open Savings Account
            </button>
          </div>

          {savingsLoading ? (
            <div className="py-10 text-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : savingsAccounts.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">No Savings Accounts Found</p>
              <p className="text-[10px] text-slate-400 mt-1">Open a savings account to register deposits and cash session teller logs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsAccounts.map((acc) => (
                <div key={acc._id} className="p-5 border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl relative space-y-3.5 hover:shadow-sm transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-xs text-slate-850 dark:text-slate-150 font-mono tracking-wide">{acc.accountNo}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{acc.accountType} Account</p>
                    </div>
                    <StatusBadge status={acc.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100 dark:border-slate-800/60 py-3 font-mono">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Available Balance</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">₹{acc.availableBalance?.toLocaleString() || '0.00'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Interest Rate</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{acc.interestRate}% p.a.</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-500">
                    <span>Opening Date: {new Date(acc.openingDate).toLocaleDateString()}</span>
                    <span>Min Balance: ₹{acc.minimumBalance || 1000}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardWrapper>
      )}

      {/* 7. Loans & Deposit Schemes */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {/* Applications list */}
          <CardWrapper className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-indigo-650" />
                Loan Applications
              </h3>
              <button
                onClick={() => router.push(`/dashboard/loans/applications/new?memberId=${id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-650/15"
              >
                <Plus className="w-3.5 h-3.5" />
                Apply for Loan
              </button>
            </div>

            {loansLoading ? (
              <div className="py-10 text-center"><LoadingSpinner size="sm" /></div>
            ) : loanApplications.length === 0 ? (
              <p className="text-xs text-slate-450 text-center py-6 font-bold">No applications registered for this member.</p>
            ) : (
              <div className="space-y-3">
                {loanApplications.map((app) => (
                  <div key={app._id} className="p-4 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between hover:bg-slate-50/20 transition-all duration-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{app.applicationNo}</p>
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-600 font-mono">
                          {app.loanProductId?.productName || 'Loan Product'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Purpose: {app.purpose || 'Not specified'}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">Applied on: {new Date(app.applicationDate || app.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100 font-mono">₹{app.requestedAmount?.toLocaleString()}</span>
                      <StatusBadge status={app.applicationStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardWrapper>

          {/* Active Loans list */}
          <CardWrapper className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800/60">
              Active Loan Accounts
            </h3>

            {loansLoading ? (
              <div className="py-10 text-center"><LoadingSpinner size="sm" /></div>
            ) : loans.length === 0 ? (
              <p className="text-xs text-slate-450 text-center py-6 font-bold">No active loan accounts.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loans.map((ln) => (
                  <div key={ln._id} className="p-5 border border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl relative space-y-3.5 hover:shadow-sm transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-xs text-slate-850 dark:text-slate-150 font-mono tracking-wide">{ln.loanNo}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{ln.loanProductId?.productName || 'Personal Loan'}</p>
                      </div>
                      <StatusBadge status={ln.loanStatus} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100 dark:border-slate-800/60 py-3 font-mono">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Outstanding Balance</span>
                        <span className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">₹{ln.outstandingPrincipal?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">EMI Amount</span>
                        <span className="font-bold text-slate-850 dark:text-slate-100">₹{ln.emiAmount?.toLocaleString()}/mo</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-500">
                      <span>Disbursed: {new Date(ln.disbursementDate).toLocaleDateString()}</span>
                      <span>Next Due: {ln.nextDueDate ? new Date(ln.nextDueDate).toLocaleDateString() : 'N/A'}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => router.push(`/dashboard/loans/${ln._id}`)}
                        className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 text-[10px] font-bold rounded-lg hover:bg-slate-200 text-center cursor-pointer transition-colors"
                      >
                        View Account Details & Schedules
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardWrapper>
        </div>
      )}

      {/* 8. Audit History Tab */}
      {activeTab === 'audit' && (
        <CardWrapper className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
            Member Audit Logs
          </h3>

          {auditLoading ? (
            <div className="py-10 text-center"><LoadingSpinner size="sm" /></div>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No audits registered for this profile.</p>
          ) : (
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
              {auditLogs.map((log) => (
                <div key={log._id} className="relative">
                  <span className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-150">
                    <History className="w-3 h-3" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-150">{log.actionName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">Performed by operator ID: {log.userId}</p>
                    {log.newValues && (
                      <div className="mt-2 text-[10px] bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-850 font-mono text-slate-500 max-h-40 overflow-y-auto">
                        <span className="font-bold">Modified State:</span> {JSON.stringify(log.newValues, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardWrapper>
      )}

      {/* DIALOGS / MODALS MODULES */}

      {/* KYC Update Modal */}
      {kycStatusOpen && (
        <div className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <CardWrapper className="p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-wide pb-2.5 border-b border-slate-150 dark:border-slate-800">
              Update KYC Status
            </h3>

            {kycError && (
              <div className="p-2 bg-rose-50 text-rose-600 text-xs rounded-lg">{kycError}</div>
            )}

            <form onSubmit={handleKycStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Auditor Decision</label>
                <select
                  value={kycStatusForm.status}
                  onChange={(e) => setKycStatusForm({ ...kycStatusForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                >
                  <option value="verified">Verified (Approved)</option>
                  <option value="rejected">Rejected (Insufficient Docs)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Decision Remarks</label>
                <textarea
                  value={kycStatusForm.remarks}
                  onChange={(e) => setKycStatusForm({ ...kycStatusForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl"
                  placeholder="Explain rationale for this decision..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setKycStatusOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Submit Audit Decision
                </button>
              </div>
            </form>
          </CardWrapper>
        </div>
      )}

      {/* Account Status Lifecycle Modal */}
      {lifecycleStatusOpen && (
        <div className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <CardWrapper className="p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-wide pb-2.5 border-b border-slate-150 dark:border-slate-800">
              Change Member Lifecycle status
            </h3>

            {lifecycleError && (
              <div className="p-2 bg-rose-50 text-rose-600 text-xs rounded-lg">{lifecycleError}</div>
            )}

            <form onSubmit={handleLifecycleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Lifecycle Stage</label>
                <select
                  value={lifecycleStatusForm.status}
                  onChange={(e) => setLifecycleStatusForm({ ...lifecycleStatusForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="closed">Closed</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Audit Remarks</label>
                <textarea
                  value={lifecycleStatusForm.remarks}
                  onChange={(e) => setLifecycleStatusForm({ ...lifecycleStatusForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl"
                  placeholder="Reason for change..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setLifecycleStatusOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </CardWrapper>
        </div>
      )}

      {/* Share Purchase Modal */}
      {sharePurchaseOpen && (
        <div className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <CardWrapper className="p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 uppercase tracking-wide pb-2.5 border-b border-slate-150 dark:border-slate-800">
              Purchase Share Capital
            </h3>

            {shareError && (
              <div className="p-2 bg-rose-50 text-rose-600 text-xs rounded-lg">{shareError}</div>
            )}

            <form onSubmit={handlePurchaseShares} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Number of Shares</label>
                <input
                  type="number"
                  min="1"
                  value={sharePurchaseForm.sharesPurchased}
                  onChange={(e) => setSharePurchaseForm({ ...sharePurchaseForm, sharesPurchased: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Share Value (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={sharePurchaseForm.shareValue}
                  onChange={(e) => setSharePurchaseForm({ ...sharePurchaseForm, shareValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  required
                  disabled
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Payment Mode</label>
                <select
                  value={sharePurchaseForm.paymentMode}
                  onChange={(e) => setSharePurchaseForm({ ...sharePurchaseForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-750"
                >
                  <option value="CASH">Cash Book</option>
                  <option value="TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Clearing Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="RTGS">RTGS</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl text-xs font-semibold text-slate-650">
                Total Share Cost: <span className="font-extrabold text-indigo-650 text-sm">₹{sharePurchaseForm.sharesPurchased * sharePurchaseForm.shareValue}.00</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setSharePurchaseOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                  disabled={shareLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  disabled={shareLoading}
                >
                  {shareLoading ? 'Processing...' : 'Dispatched Purchase'}
                </button>
              </div>
            </form>
          </CardWrapper>
        </div>
      )}

      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          {depositsLoading ? (
            <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
          ) : (
            <>
              {/* RD Accounts */}
              <CardWrapper className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-blue-500" /> Recurring Deposits ({deposits.rd.length})
                  </h3>
                  <button onClick={() => router.push('/dashboard/deposits/rd')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Enroll RD
                  </button>
                </div>
                {deposits.rd.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No RD accounts found for this member</p>
                ) : (
                  <div className="space-y-2">
                    {deposits.rd.map(acct => (
                      <div key={acct._id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">{acct.rdAccountNo}</span>
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">{acct.status}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">₹{acct.monthlyInstallment}/mo × {acct.tenureMonths} months • Rate: {acct.interestRate}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-indigo-600">₹{(acct.maturityAmount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">Maturity: {acct.maturityDate ? new Date(acct.maturityDate).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardWrapper>

              {/* FD Accounts */}
              <CardWrapper className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Fixed Deposits ({deposits.fd.length})
                  </h3>
                  <button onClick={() => router.push('/dashboard/deposits/fd')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Book FD
                  </button>
                </div>
                {deposits.fd.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No FD accounts found for this member</p>
                ) : (
                  <div className="space-y-2">
                    {deposits.fd.map(acct => (
                      <div key={acct._id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">{acct.fdAccountNo}</span>
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{acct.status}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Principal: ₹{(acct.principalAmount || 0).toLocaleString()} • {acct.tenureMonths} months • Rate: {acct.interestRate}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-indigo-600">₹{(acct.maturityAmount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">Maturity: {acct.maturityDate ? new Date(acct.maturityDate).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardWrapper>

              {/* DDS Accounts */}
              <CardWrapper className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-violet-500" /> Daily Deposits ({deposits.dds.length})
                  </h3>
                  <button onClick={() => router.push('/dashboard/deposits/dds')} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-xl hover:bg-violet-100 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Open DDS
                  </button>
                </div>
                {deposits.dds.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No DDS accounts found for this member</p>
                ) : (
                  <div className="space-y-2">
                    {deposits.dds.map(acct => (
                      <div key={acct._id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">{acct.ddsAccountNo}</span>
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200">{acct.status}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">₹{acct.dailyAmount}/day × {acct.durationDays} days • Collected: ₹{(acct.totalDeposit || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-indigo-600">₹{(acct.maturityAmount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400">Maturity: {acct.maturityDate ? new Date(acct.maturityDate).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardWrapper>

              {/* MIS Accounts */}
              <CardWrapper className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-amber-500" /> Monthly Investment Scheme ({deposits.mis.length})
                  </h3>
                  <button onClick={() => router.push('/dashboard/deposits/mis')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-100 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Open MIS
                  </button>
                </div>
                {deposits.mis.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No MIS accounts found for this member</p>
                ) : (
                  <div className="space-y-2">
                    {deposits.mis.map(acct => (
                      <div key={acct._id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">{acct.misAccountNo}</span>
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{acct.status}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Principal: ₹{(acct.principalAmount || 0).toLocaleString()} • Monthly Investment: ₹{(acct.monthlyInterestAmount || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-amber-600">₹{(acct.monthlyInterestAmount || 0).toLocaleString()}/mo</p>
                          <p className="text-[10px] text-slate-400">Next Payout: {acct.nextPayoutDate ? new Date(acct.nextPayoutDate).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardWrapper>
            </>
          )}
        </div>
      )}

    </div>
  );
}
