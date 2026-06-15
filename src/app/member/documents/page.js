'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Eye, ShieldCheck, AlertCircle } from 'lucide-react';

export default function MemberDocuments() {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch('/api/member/documents');
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Failed to fetch documents list');
        setDocs(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Opening member document vault...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Failed to load locker</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Digital Document Locker</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Access verified KYC documents and download account statements or scheme certificates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: KYC Documents */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">KYC Verification Documents</h3>
          </div>

          {(!docs?.kyc || docs.kyc.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500">No KYC documents registered. Contact branch operator.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-900">
              {docs.kyc.map((doc) => (
                <div key={doc._id} className="p-6 flex items-center justify-between hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 capitalize">
                        {doc.documentType.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {doc.documentName}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[9px]">
                        {doc.verificationStatus === 'verified' ? (
                          <span className="flex items-center gap-1 text-emerald-500 font-bold uppercase">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-500 font-bold uppercase">
                            <AlertCircle className="w-3.5 h-3.5" /> {doc.verificationStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <a
                    href={doc.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Statements & Certificates */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-250/50 dark:border-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Statements & Certificates</h3>
          </div>

          {(!docs?.statements || docs.statements.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-500">No statements or certificates generated yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-900">
              {docs.statements.map((stmt) => (
                <div key={stmt._id} className="p-6 flex items-center justify-between hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 capitalize">
                        {stmt.accountType.toUpperCase()} {stmt.documentType}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Acc ID: {stmt.accountId}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-450 dark:text-slate-500 mt-1 font-semibold uppercase">
                        <span>Format: {stmt.format}</span>
                        <span>•</span>
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(stmt.generatedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={stmt.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-650 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
