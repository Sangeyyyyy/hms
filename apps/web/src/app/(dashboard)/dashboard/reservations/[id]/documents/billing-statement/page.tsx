'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Printer, ShieldAlert } from 'lucide-react';

interface Charge {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  type: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  referenceNumber?: string;
  paidAt: string;
}

interface Reservation {
  id: string;
  reservationNumber: string;
  status: string;
  clientType: 'INTERNAL' | 'EXTERNAL';
  holderFirstName: string;
  holderLastName: string;
  holderEmail: string;
  holderPhone: string;
  checkInDate: string;
  checkOutDate: string;
  facilities: Array<{ facility: { facilityCode: string; building: string; facilityType: { name: string } }; rateApplied: number }>;
  charges: Charge[];
  payments: Payment[];
  createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BillingStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const res = await apiClient.get(`/reservations/${id}`);
        setReservation(res.data);
      } catch {
        toast.error('Reservation not found');
        router.push('/dashboard/reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReservation();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Generating statement…</p>
      </div>
    );
  }

  if (!reservation) return null;

  const nights = Math.max(1, Math.ceil(
    (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) / 86400000
  ));
  const totalCharges = reservation.charges.reduce((s, c) => s + c.amount * c.quantity, 0);
  const totalPayments = reservation.payments.reduce((s, p) => s + p.amount, 0);
  const balance = totalCharges - totalPayments;

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Cash', PPMP: 'PPMP', PURCHASE_ORDER: 'Purchase Order',
  };

  return (
    <>
      {/* Print Controls */}
      <div className="print:hidden max-w-4xl mx-auto mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg shadow transition"
        >
          <Printer className="w-4 h-4" /> Print Statement
        </button>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print-container { max-width: 100% !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* Statement Sheet */}
      <div className="print-container max-w-4xl mx-auto bg-white text-gray-900 border border-gray-200 rounded-xl shadow-md overflow-hidden p-8 print:p-0">
        
        {/* Letterhead */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-5 mb-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-950">DAVAO DEL NORTE STATE COLLEGE</h1>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Hostel & Lodging Operations</p>
            <p className="text-xs text-gray-500">New Visayas, Panabo City, Davao del Norte</p>
            <p className="text-xs text-gray-500">Email: hostel@dnsc.edu.ph | Tel: (084) 628-4300</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-gray-950 tracking-tight">BILLING STATEMENT</h2>
            <p className="text-sm font-mono text-gray-600 mt-1">Ref: {reservation.reservationNumber}</p>
            <p className="text-xs text-gray-500 mt-1">Date Issued: {new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}</p>
          </div>
        </div>

        {/* Guest info details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">BILLED TO:</p>
            <p className="text-base font-black text-gray-900">{reservation.holderFirstName} {reservation.holderLastName}</p>
            <p className="text-sm text-gray-600 mt-0.5">{reservation.holderEmail}</p>
            <p className="text-sm text-gray-600">{reservation.holderPhone}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-3 mb-0.5">Client Type:</p>
            <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${reservation.clientType === 'INTERNAL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
              {reservation.clientType} CLIENT
            </span>
          </div>
          <div className="text-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">STAY DETAILS:</p>
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-100"><td className="text-gray-500 py-1">Check-In Date:</td><td className="font-bold text-right">{formatDateOnly(reservation.checkInDate)}</td></tr>
                <tr className="border-b border-gray-100"><td className="text-gray-500 py-1">Check-Out Date:</td><td className="font-bold text-right">{formatDateOnly(reservation.checkOutDate)}</td></tr>
                <tr className="border-b border-gray-100"><td className="text-gray-500 py-1">Length of Stay:</td><td className="font-bold text-right">{nights} night{nights !== 1 ? 's' : ''}</td></tr>
                <tr className="border-b border-gray-100"><td className="text-gray-500 py-1">Status:</td><td className="font-bold text-right text-violet-700">{reservation.status.replace('_',' ')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Facilities Table */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Facility Details:</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 border-y border-gray-300 text-xs font-bold text-gray-600 uppercase">
                <th className="text-left p-2">Room / Unit</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Building</th>
                <th className="text-right p-2">Daily Rate</th>
                <th className="text-right p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {reservation.facilities.map((rf, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2 font-bold">{rf.facility.facilityCode}</td>
                  <td className="p-2 text-gray-600">{rf.facility.facilityType.name}</td>
                  <td className="p-2 text-gray-600">{rf.facility.building}</td>
                  <td className="p-2 text-right font-semibold">₱{rf.rateApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 text-right font-bold">₱{(rf.rateApplied * nights).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ledger Details Table */}
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Itemized Ledger Account:</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white text-xs font-bold uppercase">
                <th className="text-left p-3">Description</th>
                <th className="text-center p-3">Quantity</th>
                <th className="text-right p-3">Rate</th>
                <th className="text-right p-3">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {reservation.charges.map((c) => (
                <tr key={c.id} className="border-b border-gray-200">
                  <td className="p-3 text-gray-800 font-medium">{c.description}</td>
                  <td className="p-3 text-center text-gray-600">×{c.quantity}</td>
                  <td className="p-3 text-right text-gray-600">₱{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right font-bold text-gray-900">₱{(c.amount * c.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t border-gray-300">
                <td colSpan={3} className="p-3 font-bold text-right text-gray-700">GROSS TOTAL CHARGES:</td>
                <td className="p-3 font-black text-right text-gray-900">₱{totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              {reservation.payments.length > 0 ? (
                <>
                  <tr className="bg-gray-100 border-t border-gray-300 text-xs font-bold text-gray-600 uppercase">
                    <th colSpan={4} className="text-left p-2">Payments Received</th>
                  </tr>
                  {reservation.payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 text-emerald-800 font-medium">
                      <td className="p-3">Received — Payment by {PAYMENT_METHOD_LABELS[p.method] ?? p.method}{p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}</td>
                      <td className="p-3 text-center text-xs text-gray-500">{formatDate(p.paidAt)}</td>
                      <td colSpan={2} className="p-3 text-right font-bold">−₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="p-3 font-bold text-right text-emerald-800">TOTAL PAYMENTS APPLIED:</td>
                    <td className="p-3 font-black text-right text-emerald-800">−₱{totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </>
              ) : (
                <tr className="border-b border-gray-100">
                  <td colSpan={4} className="p-3 text-center text-gray-400 italic">No payments applied yet.</td>
                </tr>
              )}
              <tr className={`border-t-2 font-black ${balance > 0 ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-emerald-400 bg-emerald-50 text-emerald-900'}`}>
                <td colSpan={3} className="p-3 text-right text-base uppercase">
                  {balance > 0 ? 'NET OUTSTANDING BALANCE DUE:' : 'LEdger account fully settled:'}
                </td>
                <td className="p-3 text-right text-xl">₱{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer section */}
        <div className="border-t border-gray-300 pt-6 mt-8">
          <div className="grid grid-cols-2 gap-8 text-center text-sm">
            <div>
              <div className="h-12 border-b border-gray-400" />
              <p className="text-xs text-gray-500 mt-1">Prepared By: Hostel Billing Staff</p>
            </div>
            <div>
              <div className="h-12 border-b border-gray-400" />
              <p className="text-xs text-gray-500 mt-1">Guest Confirmation / Signature</p>
            </div>
          </div>
          <div className="text-center text-xs text-gray-400 mt-8">
            <p>Thank you for staying with DNSC Hostel!</p>
            <p className="mt-0.5">This document serves as an itemized statement of accounts for hostel transactions.</p>
          </div>
        </div>

      </div>
    </>
  );
}
