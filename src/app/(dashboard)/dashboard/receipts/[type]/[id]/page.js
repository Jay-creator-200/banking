'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner.jsx';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : 'N/A';

export default function PrintableReceiptPage() {
  const params = useParams();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/receipts/${params.type}/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error?.message || 'Failed to load receipt');
        setPayload(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.type, params.id]);

  const rows = useMemo(() => payload ? buildRows(payload) : [], [payload]);

  if (loading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-sm text-rose-600">{error}</div>;

  const { settings = {}, record, type, entries = [] } = payload;
  const branch = record.branchId || {};
  const title = type === 'voucher' ? `${record.voucherType} Voucher` : type === 'salary' ? 'Salary Payment Receipt' : type === 'expense' ? 'Expense Payment Receipt' : 'Transaction Receipt';
  const receiptNo = record.transactionNo || record.voucherNo || record.salaryNo || record.expenseNo || record._id;

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="max-w-[900px] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"><Printer className="w-4 h-4" /> Print Receipt</button>
      </div>

      <div className={`mx-auto bg-white text-slate-900 border border-slate-300 shadow-sm print:shadow-none relative ${settings.receiptSize === 'THERMAL_80' ? 'max-w-[320px]' : 'max-w-[900px]'}`}>
        {settings.showWatermark && <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-slate-100 rotate-[-25deg] pointer-events-none">PAID</div>}
        <div className="relative p-8 space-y-6">
          <div className="text-center border-b border-slate-300 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {settings.showLogo && settings.logoUrl && <img src={settings.logoUrl} alt="" className="h-12 mx-auto mb-2 object-contain" />}
            <h1 className="text-xl font-black uppercase">{settings.institutionName || 'Noble Cooperative Society'}</h1>
            <p className="text-xs mt-1 whitespace-pre-wrap">{settings.institutionAddress || [branch.address, branch.city, branch.state].filter(Boolean).join(', ')}</p>
            <p className="text-xs">{settings.contactLine || branch.contactNumber || ''}</p>
          </div>

          <div className="text-center">
            <h2 className="text-base font-black uppercase tracking-wide">{title}</h2>
            <p className="text-[10px] text-slate-500">Original / Customer Copy</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><b>Receipt No:</b> {receiptNo}</div>
            <div className="text-right"><b>Date:</b> {dateTime(record.approvedAt || record.paymentDate || record.voucherDate || record.createdAt)}</div>
            <div><b>Branch:</b> {branch.branchName || 'N/A'} {branch.branchCode ? `(${branch.branchCode})` : ''}</div>
            <div className="text-right"><b>Printed:</b> {dateTime(payload.printedAt)}</div>
          </div>

          <div className="border border-slate-300">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[190px_1fr] border-b last:border-b-0 border-slate-300 text-xs">
                <div className="p-2 font-bold bg-slate-50 border-r border-slate-300">{label}</div>
                <div className="p-2">{value || 'N/A'}</div>
              </div>
            ))}
          </div>

          {entries.length > 0 && (
            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border border-slate-300 text-left">Account Head</th>
                  <th className="p-2 border border-slate-300 text-right">Debit</th>
                  <th className="p-2 border border-slate-300 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td className="p-2 border border-slate-300">{entry.accountHeadId?.name || 'N/A'} {entry.accountHeadId?.code ? `(${entry.accountHeadId.code})` : ''}</td>
                    <td className="p-2 border border-slate-300 text-right">{money(entry.debit || entry.debitAmount)}</td>
                    <td className="p-2 border border-slate-300 text-right">{money(entry.credit || entry.creditAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-between pt-12 text-xs font-bold">
            <span>Receiver Signature</span>
            <span>{settings.authorizedSignatoryLabel || 'Authorized Signatory'}</span>
          </div>
          <p className="text-[10px] text-center text-slate-500 border-t border-slate-200 pt-3">{settings.footerNote}</p>
        </div>
      </div>
    </div>
  );
}

function buildRows({ type, record }) {
  if (type === 'transaction') {
    return [
      ['Transaction Type', record.transactionType],
      ['Member', record.memberId?.fullName],
      ['Member No', record.memberId?.memberNo],
      ['Account / Reference', record.accountId],
      ['Payment Mode', record.paymentMode],
      ['Amount', money(record.amount)],
      ['Balance After', record.balanceAfter === undefined ? 'N/A' : money(record.balanceAfter)],
      ['Narration', record.narration],
      ['Status', record.status],
    ];
  }
  if (type === 'expense') {
    return [
      ['Expense No', record.expenseNo],
      ['Category', record.category],
      ['Payee / Vendor', record.vendor],
      ['Payment Mode', record.paymentMode],
      ['Amount', money(record.amount)],
      ['Account Head', record.accountHeadId?.name],
      ['Narration', record.description],
      ['Status', record.approvalStatus],
    ];
  }
  if (type === 'salary') {
    return [
      ['Salary No', record.salaryNo],
      ['Employee', record.employeeId?.fullName],
      ['Employee Code', record.employeeId?.employeeCode],
      ['Designation', record.employeeId?.designation],
      ['Salary Month', record.salaryMonth],
      ['Basic Salary', money(record.basicSalary)],
      ['Allowances', money(record.allowances)],
      ['Deductions', money(record.deductions)],
      ['Net Salary Paid', money(record.netSalary)],
      ['Payment Mode', record.paymentMode],
      ['Remarks', record.remarks],
    ];
  }
  return [
    ['Voucher No', record.voucherNo],
    ['Voucher Type', record.voucherType],
    ['Narration', record.narration],
    ['Approved By', record.approvedBy?.fullName],
  ];
}
