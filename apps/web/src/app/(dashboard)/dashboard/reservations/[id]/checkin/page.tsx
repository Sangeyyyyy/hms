'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, Building2, Users, CalendarDays,
  MapPin, Phone, Mail, Hash, ClipboardCheck, ShieldCheck, AlertTriangle,
  Clock, UserCheck, FileText, Printer,
} from 'lucide-react';

interface FacilityType { name: string; defaultRate: number; }
interface Facility { facilityCode: string; building: string; facilityType: FacilityType; }
interface ReservationFacility { facility: Facility; rateApplied: number; }
interface Occupant { id: string; firstName: string; lastName: string; email?: string; phone?: string; }
interface CheckInRecord {
  id: string;
  actualArrivalAt: string;
  verificationNotes?: string;
  facilitiesSnapshot: any[];
  actualOccupantCount: number;
  remarks?: string;
  processedBy: { firstName: string; lastName: string };
  createdAt: string;
}
interface Reservation {
  id: string;
  reservationNumber: string;
  status: string;
  holderFirstName: string;
  holderLastName: string;
  holderEmail: string;
  holderPhone: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  facilities: ReservationFacility[];
  occupants: Occupant[];
  checkInRecord?: CheckInRecord | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<{
    reservation: Reservation;
    billingSummary: { totalCharges: number; totalPayments: number; remainingBalance: number };
    canCheckIn: boolean;
    alreadyCheckedIn: boolean;
  } | null>(null);

  const [form, setForm] = useState({
    actualArrivalAt: new Date().toISOString().slice(0, 16),
    verificationNotes: '',
    actualOccupantCount: 0,
    remarks: '',
  });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/checkin/reservations/${id}`);
        setDetails(res.data);
        setForm((prev) => ({
          ...prev,
          actualOccupantCount: res.data.reservation.occupants?.length ?? 0,
        }));
      } catch {
        toast.error('Reservation not found');
        router.push('/dashboard/reservations');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/checkin/reservations/${id}`, {
        actualArrivalAt: new Date(form.actualArrivalAt).toISOString(),
        verificationNotes: form.verificationNotes || undefined,
        actualOccupantCount: Number(form.actualOccupantCount),
        remarks: form.remarks || undefined,
      });
      toast.success('Check-in completed successfully!');
      router.push(`/dashboard/reservations/${id}/checkin/slip`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading reservation…</p>
      </div>
    );
  }

  if (!details) return null;
  const { reservation, billingSummary, canCheckIn, alreadyCheckedIn } = details;
  const nights = Math.max(1, Math.ceil(
    (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) / 86400000
  ));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/dashboard/reservations/${id}`} className="hover:text-foreground flex items-center gap-1 transition">
          <ArrowLeft className="w-4 h-4" /> {reservation.reservationNumber}
        </Link>
        <span>/</span>
        <span className="font-bold text-foreground">Check-In</span>
      </div>

      {/* Page Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">Guest Check-In</h1>
            <p className="text-emerald-100 text-sm">Verify reservation and record actual arrival</p>
          </div>
        </div>
      </div>

      {/* Already Checked In Banner */}
      {alreadyCheckedIn && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 dark:text-emerald-300">Already Checked In</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              This reservation was checked in on {formatDate(reservation.checkInRecord!.actualArrivalAt)}.
            </p>
          </div>
          <Link
            href={`/dashboard/reservations/${id}/checkin/slip`}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print Slip
          </Link>
        </div>
      )}

      {/* Reservation Summary Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Reservation Verification</span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{reservation.reservationNumber}</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Guest Info */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reservation Holder</p>
            <p className="font-extrabold text-lg text-foreground">{reservation.holderFirstName} {reservation.holderLastName}</p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{reservation.holderEmail}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{reservation.holderPhone}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stay Duration</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-In:</span>
                <span className="font-bold">{formatDateOnly(reservation.checkInDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Check-Out:</span>
                <span className="font-bold">{formatDateOnly(reservation.checkOutDate)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-extrabold text-primary">{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div className="md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Assigned Facilities</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reservation.facilities.map((rf, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="p-1.5 bg-primary/10 rounded text-primary">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{rf.facility.facilityCode}</p>
                    <p className="text-xs text-muted-foreground">{rf.facility.facilityType.name} · {rf.facility.building}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-primary">₱{rf.rateApplied.toLocaleString()}/night</span>
                </div>
              ))}
            </div>
          </div>

          {/* Occupants */}
          {reservation.occupants.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Registered Occupants ({reservation.occupants.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {reservation.occupants.map((occ) => (
                  <span key={occ.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted border border-border rounded-lg text-sm">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    {occ.firstName} {occ.lastName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Billing Status */}
          <div className="md:col-span-2 pt-4 border-t border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Billing Snapshot</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                <p className="text-xs text-blue-600 font-semibold">Total Charges</p>
                <p className="font-black text-blue-800 dark:text-blue-300">₱{billingSummary.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
                <p className="text-xs text-emerald-600 font-semibold">Paid</p>
                <p className="font-black text-emerald-800 dark:text-emerald-300">₱{billingSummary.totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={`p-3 rounded-lg border ${billingSummary.remainingBalance > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900'}`}>
                <p className={`text-xs font-semibold ${billingSummary.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Balance</p>
                <p className={`font-black ${billingSummary.remainingBalance > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                  ₱{billingSummary.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Check-In Form */}
      {canCheckIn && !alreadyCheckedIn && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Complete Check-In</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Actual Arrival Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.actualArrivalAt}
                  onChange={(e) => setForm({ ...form, actualArrivalAt: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                  <Users className="w-3 h-3 inline mr-1" />
                  Actual Occupant Count
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.actualOccupantCount}
                  onChange={(e) => setForm({ ...form, actualOccupantCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                <ShieldCheck className="w-3 h-3 inline mr-1" />
                Verification Notes (IDs checked, key cards issued, etc.)
              </label>
              <textarea
                rows={2}
                value={form.verificationNotes}
                onChange={(e) => setForm({ ...form, verificationNotes: e.target.value })}
                placeholder="e.g. Gov ID verified. 2 key cards issued for Unit A1."
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                <FileText className="w-3 h-3 inline mr-1" />
                Additional Remarks
              </label>
              <textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Any additional check-in notes…"
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                This will update status to <strong>Checked In</strong> and generate a check-in slip.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow transition disabled:opacity-75"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                Confirm Check-In
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Not eligible warning */}
      {!canCheckIn && !alreadyCheckedIn && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300">Cannot Perform Check-In</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Reservation must be in <strong>Confirmed</strong> status to check in. Current status: <strong>{reservation.status}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
