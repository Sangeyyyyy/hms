'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Printer, Building2 } from 'lucide-react';

interface CheckInRecord {
  id: string;
  actualArrivalAt: string;
  verificationNotes?: string;
  facilitiesSnapshot: Array<{
    facilityCode: string;
    building: string;
    facilityType: string;
    rateApplied: number;
  }>;
  actualOccupantCount: number;
  remarks?: string;
  processedBy: { firstName: string; lastName: string };
  createdAt: string;
  reservation: {
    id: string;
    reservationNumber: string;
    holderFirstName: string;
    holderLastName: string;
    holderEmail: string;
    holderPhone: string;
    checkInDate: string;
    checkOutDate: string;
    notes?: string;
    charges: Array<{ id: string; description: string; quantity: number; amount: number; type: string }>;
    payments: Array<{ id: string; amount: number; method: string; referenceNumber?: string; paidAt: string }>;
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CheckInSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<CheckInRecord | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await apiClient.get(`/checkin/reservations/${id}/record`);
        setRecord(res.data);
      } catch {
        toast.error('Check-in record not found');
        router.push(`/dashboard/reservations/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading slip…</p>
      </div>
    );
  }

  if (!record) return null;

  const { reservation } = record;
  const nights = Math.max(1, Math.ceil(
    (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) / 86400000
  ));
  const totalCharges = reservation.charges.reduce((s, c) => s + c.amount * c.quantity, 0);
  const totalPayments = reservation.payments.reduce((s, p) => s + p.amount, 0);
  const remainingBalance = totalCharges - totalPayments;

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Cash',
    PPMP: 'PPMP',
    PURCHASE_ORDER: 'Purchase Order',
  };

  return (
    <>
      {/* ─── Screen-only controls ────────────────────────────────── */}
      <div className="print:hidden max-w-3xl mx-auto mb-6 flex items-center gap-3">
        <Link href={`/dashboard/reservations/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" /> Back to Reservation
        </Link>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg shadow transition"
        >
          <Printer className="w-4 h-4" /> Print Slip
        </button>
      </div>

      {/* ─── Printable Slip ──────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .slip-page { max-width: 100% !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="slip-page max-w-3xl mx-auto bg-white text-gray-900 rounded-xl shadow-lg border border-gray-200 overflow-hidden print:rounded-none">
        {/* Slip Header */}
        <div className="bg-emerald-600 text-white px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">DNSC HOSTEL</h1>
              <p className="text-emerald-100 text-sm mt-0.5">Davao del Norte State College</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black">CHECK-IN SLIP</div>
              <div className="font-mono text-emerald-100 text-sm mt-0.5">{reservation.reservationNumber}</div>
            </div>
          </div>
        </div>

        {/* Slip Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Guest Info Row */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Guest Name</p>
              <p className="text-lg font-extrabold">{reservation.holderFirstName} {reservation.holderLastName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{reservation.holderEmail}</p>
              <p className="text-sm text-gray-600">{reservation.holderPhone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Stay Information</p>
              <table className="text-sm w-full">
                <tbody>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Check-In:</td><td className="font-bold">{formatDateOnly(reservation.checkInDate)}</td></tr>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Check-Out:</td><td className="font-bold">{formatDateOnly(reservation.checkOutDate)}</td></tr>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Duration:</td><td className="font-extrabold text-emerald-700">{nights} night{nights !== 1 ? 's' : ''}</td></tr>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Occupants:</td><td className="font-bold">{record.actualOccupantCount} pax</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-dashed border-gray-300" />

          {/* Actual Arrival */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Actual Arrival</p>
            <p className="font-extrabold text-emerald-900 text-base">{formatDate(record.actualArrivalAt)}</p>
          </div>

          {/* Facilities Assigned */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Facilities</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="text-left p-2 font-semibold">Unit</th>
                  <th className="text-left p-2 font-semibold">Type</th>
                  <th className="text-left p-2 font-semibold">Building</th>
                  <th className="text-right p-2 font-semibold">Rate/Night</th>
                  <th className="text-right p-2 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {record.facilitiesSnapshot.map((f, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="p-2 font-bold">{f.facilityCode}</td>
                    <td className="p-2 text-gray-600">{f.facilityType}</td>
                    <td className="p-2 text-gray-600">{f.building}</td>
                    <td className="p-2 text-right font-semibold">₱{f.rateApplied.toLocaleString()}</td>
                    <td className="p-2 text-right font-bold">₱{(f.rateApplied * nights).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charges Summary */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Billing Summary</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {reservation.charges.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-700">{c.description}</td>
                      <td className="px-4 py-2 text-right text-gray-600">×{c.quantity}</td>
                      <td className="px-4 py-2 text-right font-semibold">₱{(c.amount * c.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={2} className="px-4 py-2 font-bold text-right">Total Charges:</td>
                    <td className="px-4 py-2 font-black text-right">₱{totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {reservation.payments.length > 0 && reservation.payments.map((p) => (
                    <tr key={p.id} className="text-emerald-700">
                      <td className="px-4 py-2">Payment - {PAYMENT_METHOD_LABELS[p.method] ?? p.method}{p.referenceNumber ? ` (${p.referenceNumber})` : ''}</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-500">{formatDate(p.paidAt)}</td>
                      <td className="px-4 py-2 text-right font-semibold">−₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className={`border-t-2 ${remainingBalance > 0 ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                    <td colSpan={2} className="px-4 py-2 font-black text-right">Balance Due:</td>
                    <td className="px-4 py-2 font-black text-right text-base">₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Notes */}
          {record.verificationNotes && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Verification Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">{record.verificationNotes}</p>
            </div>
          )}

          {/* Remarks */}
          {record.remarks && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">{record.remarks}</p>
            </div>
          )}

          {/* Divider */}
          <hr className="border-dashed border-gray-300" />

          {/* Signature / Footer Row */}
          <div className="grid grid-cols-2 gap-8 pt-2">
            <div>
              <div className="h-12 border-b-2 border-gray-400" />
              <p className="text-xs text-gray-500 mt-1 text-center">Guest Signature / Date</p>
            </div>
            <div>
              <div className="h-12 border-b-2 border-gray-400" />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Processed by: {record.processedBy.firstName} {record.processedBy.lastName}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">
              Slip generated: {formatDate(record.createdAt)} · DNSC Hostel Management System
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              This document serves as official confirmation of check-in.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
