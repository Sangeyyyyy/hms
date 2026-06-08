'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';

interface DamageItem {
  description: string;
  estimatedCost: number;
  location?: string;
}

interface CheckOutRecord {
  id: string;
  actualDepartureAt: string;
  inventoryNotes?: string;
  damagesNoted: DamageItem[];
  damageChargesApplied: boolean;
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
    facilities: Array<{ facility: { facilityCode: string; building: string; facilityType: { name: string } }; rateApplied: number }>;
    occupants: Array<{ id: string; firstName: string; lastName: string }>;
    charges: Array<{ id: string; description: string; quantity: number; amount: number; type: string }>;
    payments: Array<{ id: string; amount: number; method: string; referenceNumber?: string; paidAt: string }>;
    checkInRecord?: { actualArrivalAt: string; processedBy: { firstName: string; lastName: string } } | null;
    inventoryCheckLogs?: any[];
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', PPMP: 'PPMP', PURCHASE_ORDER: 'Purchase Order',
};
const CHARGE_TYPE_LABELS: Record<string, string> = {
  ROOM_CHARGE: 'Room Charge', FUNCTION_HALL_CHARGE: 'Function Hall Charge',
  EXTRA_BED: 'Extra Bed', EARLY_CHECK_IN: 'Early Check-In',
  LATE_CHECK_OUT: 'Late Check-Out', DAMAGE_CHARGE: 'Damage Charge', ADDITIONAL_REQUEST: 'Additional Request',
};

export default function CheckOutSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<CheckOutRecord | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await apiClient.get(`/checkin/checkout/reservations/${id}/record`);
        setRecord(res.data);
      } catch {
        toast.error('Check-out record not found');
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
  const damagesNoted = Array.isArray(record.damagesNoted) ? record.damagesNoted : [];
  const totalDamageCost = damagesNoted.reduce((s, d) => s + (d.estimatedCost ?? 0), 0);

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

      <style>{`
        @media print {
          body { background: white !important; }
          .slip-page { max-width: 100% !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="slip-page max-w-3xl mx-auto bg-white text-gray-900 rounded-xl shadow-lg border border-gray-200 overflow-hidden print:rounded-none">
        {/* Slip Header */}
        <div className="bg-violet-700 text-white px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">DNSC HOSTEL</h1>
              <p className="text-violet-200 text-sm mt-0.5">Davao del Norte State College</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black">CHECK-OUT SLIP</div>
              <div className="font-mono text-violet-200 text-sm mt-0.5">{reservation.reservationNumber}</div>
            </div>
          </div>
        </div>

        {/* Slip Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Guest + Stay Row */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Guest Name</p>
              <p className="text-lg font-extrabold">{reservation.holderFirstName} {reservation.holderLastName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{reservation.holderEmail}</p>
              <p className="text-sm text-gray-600">{reservation.holderPhone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Stay Details</p>
              <table className="text-sm w-full">
                <tbody>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Check-In:</td><td className="font-bold">{formatDateOnly(reservation.checkInDate)}</td></tr>
                  {reservation.checkInRecord && (
                    <tr><td className="text-gray-500 pr-2 py-0.5">Arrived:</td><td className="font-semibold text-emerald-700">{formatDate(reservation.checkInRecord.actualArrivalAt)}</td></tr>
                  )}
                  <tr><td className="text-gray-500 pr-2 py-0.5">Check-Out:</td><td className="font-bold">{formatDateOnly(reservation.checkOutDate)}</td></tr>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Departed:</td><td className="font-semibold text-violet-700">{formatDate(record.actualDepartureAt)}</td></tr>
                  <tr><td className="text-gray-500 pr-2 py-0.5">Duration:</td><td className="font-extrabold text-violet-700">{nights} night{nights !== 1 ? 's' : ''}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-dashed border-gray-300" />

          {/* Actual Departure Highlight */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-0.5">Actual Departure</p>
            <p className="font-extrabold text-violet-900 text-base">{formatDate(record.actualDepartureAt)}</p>
          </div>

          {/* Facilities Released */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Facilities Released</p>
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
                {reservation.facilities.map((rf, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="p-2 font-bold">{rf.facility.facilityCode}</td>
                    <td className="p-2 text-gray-600">{rf.facility.facilityType.name}</td>
                    <td className="p-2 text-gray-600">{rf.facility.building}</td>
                    <td className="p-2 text-right font-semibold">₱{rf.rateApplied.toLocaleString()}</td>
                    <td className="p-2 text-right font-bold">₱{(rf.rateApplied * nights).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inventory Check Logs */}
          {reservation.inventoryCheckLogs && reservation.inventoryCheckLogs.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Inventory Checks (Missing/Damaged Assets)
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-amber-50 border-y border-amber-200 text-xs text-amber-700 uppercase">
                    <th className="text-left p-2 font-semibold">Item Name</th>
                    <th className="text-left p-2 font-semibold">Facility</th>
                    <th className="text-center p-2 font-semibold">Missing</th>
                    <th className="text-center p-2 font-semibold">Damaged</th>
                    <th className="text-right p-2 font-semibold">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {reservation.inventoryCheckLogs.map((log: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 text-gray-700">
                      <td className="p-2 font-medium">
                        {log.itemName}
                        {log.remarks && <p className="text-xs text-gray-500 mt-0.5">Note: {log.remarks}</p>}
                      </td>
                      <td className="p-2">{log.facilityCode}</td>
                      <td className="p-2 text-center">{log.quantityMissing || 0}</td>
                      <td className="p-2 text-center">{log.quantityDamaged || 0}</td>
                      <td className="p-2 text-right font-semibold text-rose-700">₱{(log.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Damages Noted */}
          {damagesNoted.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Additional Damages Noted {record.damageChargesApplied && <span className="text-rose-600 ml-1">(Charges Applied)</span>}
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-rose-50 border-y border-rose-200 text-xs text-rose-700 uppercase">
                    <th className="text-left p-2 font-semibold">Description</th>
                    <th className="text-left p-2 font-semibold">Location</th>
                    <th className="text-right p-2 font-semibold">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {damagesNoted.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-2">{d.description}</td>
                      <td className="p-2 text-gray-500">{d.location || '—'}</td>
                      <td className="p-2 text-right font-semibold text-rose-700">₱{(d.estimatedCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-rose-50 border-t border-rose-200">
                    <td colSpan={2} className="p-2 font-bold text-right text-rose-800">Total Damage Cost:</td>
                    <td className="p-2 font-black text-right text-rose-800">₱{totalDamageCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Full Billing Breakdown */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Final Billing Statement</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-center p-3 font-semibold">Qty</th>
                    <th className="text-right p-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reservation.charges.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-700">
                        {c.description}
                        <span className="ml-1 text-xs text-gray-400">({CHARGE_TYPE_LABELS[c.type] ?? c.type})</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">×{c.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold">₱{(c.amount * c.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={2} className="px-3 py-2 font-bold text-right">Total Charges:</td>
                    <td className="px-3 py-2 font-black text-right">₱{totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {reservation.payments.map((p) => (
                    <tr key={p.id} className="text-emerald-700">
                      <td className="px-3 py-2 col-span-2">
                        Payment — {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        {p.referenceNumber ? ` (${p.referenceNumber})` : ''}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-500">{formatDate(p.paidAt)}</td>
                      <td className="px-3 py-2 text-right font-semibold">−₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className={`border-t-2 font-black ${remainingBalance > 0 ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-emerald-400 bg-emerald-50 text-emerald-800'}`}>
                    <td colSpan={2} className="px-3 py-3 text-right text-base">
                      {remainingBalance > 0 ? 'BALANCE DUE:' : 'FULLY SETTLED:'}
                    </td>
                    <td className="px-3 py-3 text-right text-xl">₱{Math.abs(remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory Notes */}
          {record.inventoryNotes && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Inventory Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">{record.inventoryNotes}</p>
            </div>
          )}

          {/* Remarks */}
          {record.remarks && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">{record.remarks}</p>
            </div>
          )}

          <hr className="border-dashed border-gray-300" />

          {/* Signatures */}
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
              This document serves as official confirmation of check-out and final billing settlement.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
