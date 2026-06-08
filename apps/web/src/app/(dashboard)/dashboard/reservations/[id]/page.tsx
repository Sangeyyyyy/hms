'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Users,
  MapPin,
  Phone,
  Mail,
  StickyNote,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Hash,
  CreditCard,
  Plus,
  Trash2,
  DollarSign,
  AlertCircle,
  FileText,
  Calendar,
  ClipboardCheck,
  LogOut,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type ReservationStatus =
  | 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN'
  | 'CHECKED_OUT' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface FacilityType { name: string; defaultRate: number; }
interface Facility { facilityCode: string; building: string; facilityType: FacilityType; }
interface ReservationFacility { facility: Facility; rateApplied: number; }
interface Occupant { id: string; firstName: string; lastName: string; email?: string; phone?: string; }

interface Charge {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  type: 'ROOM_CHARGE' | 'FUNCTION_HALL_CHARGE' | 'EXTRA_BED' | 'EARLY_CHECK_IN' | 'LATE_CHECK_OUT' | 'DAMAGE_CHARGE' | 'ADDITIONAL_REQUEST';
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  method: 'CASH' | 'PPMP' | 'PURCHASE_ORDER';
  referenceNumber?: string;
  paidAt: string;
}

interface BillingSummary {
  totalCharges: number;
  totalPayments: number;
  remainingBalance: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}

interface Reservation {
  id: string;
  reservationNumber: string;
  status: ReservationStatus;
  holderFirstName: string;
  holderLastName: string;
  holderEmail: string;
  holderPhone: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  facilities: ReservationFacility[];
  occupants: Occupant[];
  createdBy?: { firstName: string; lastName: string } | null;
  charges: Charge[];
  payments: Payment[];
  billingSummary?: BillingSummary;
}

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:       { label: 'Draft',       color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800/40',   border: 'border-slate-300 dark:border-slate-700' },
  PENDING:     { label: 'Pending',     color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-300 dark:border-amber-900' },
  CONFIRMED:   { label: 'Confirmed',   color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/30',      border: 'border-blue-300 dark:border-blue-900' },
  CHECKED_IN:  { label: 'Checked In',  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-900' },
  CHECKED_OUT: { label: 'Checked Out', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30',  border: 'border-violet-300 dark:border-violet-900' },
  COMPLETED:   { label: 'Completed',   color: 'text-teal-700 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-950/30',      border: 'border-teal-300 dark:border-teal-900' },
  CANCELLED:   { label: 'Cancelled',   color: 'text-rose-700 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-950/30',      border: 'border-rose-300 dark:border-rose-900' },
  NO_SHOW:     { label: 'No Show',     color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30',  border: 'border-orange-300 dark:border-orange-900' },
};

const BILLING_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  UNPAID:         { label: 'Unpaid',         color: 'text-rose-700 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-950/30',     border: 'border-rose-200 dark:border-rose-900' },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-900' },
  PAID:           { label: 'Paid',           color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900' },
};

const CHARGE_TYPE_LABELS: Record<string, string> = {
  ROOM_CHARGE: 'Room Charge',
  FUNCTION_HALL_CHARGE: 'Function Hall Charge',
  EXTRA_BED: 'Extra Bed',
  EARLY_CHECK_IN: 'Early Check-In',
  LATE_CHECK_OUT: 'Late Check-Out',
  DAMAGE_CHARGE: 'Damage Charge',
  ADDITIONAL_REQUEST: 'Additional Request',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  PPMP: 'PPMP',
  PURCHASE_ORDER: 'Purchase Order',
};

const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  DRAFT:       ['PENDING', 'CANCELLED'],
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN:  ['CHECKED_OUT'],
  CHECKED_OUT: ['COMPLETED'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function BillingStatusBadge({ status }: { status: string }) {
  const cfg = BILLING_STATUS_CONFIG[status] ?? BILLING_STATUS_CONFIG.UNPAID;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDateOnly(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'billing'>('details');

  // Action Modals State
  const [statusLoading, setStatusLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<ReservationStatus | null>(null);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'charge' | 'payment';
    id: string;
    label: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Billing add modals
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  // New Charge form
  const [chargeForm, setChargeForm] = useState({
    description: '',
    quantity: 1,
    amount: 0,
    type: 'EXTRA_BED' as Charge['type'],
  });

  // New Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'CASH' as Payment['method'],
    referenceNumber: '',
    paidAt: new Date().toISOString().slice(0, 16), // datetime-local format
  });

  const fetchReservation = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/reservations/${id}`);
      setReservation(res.data);
    } catch {
      toast.error('Reservation not found');
      router.push('/dashboard/reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReservation(); }, [id]);

  const performStatusChange = async (newStatus: ReservationStatus) => {
    setStatusLoading(true);
    try {
      const res = await apiClient.patch(`/reservations/${id}/status`, { status: newStatus });
      setReservation(res.data);
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Status update failed');
    } finally {
      setStatusLoading(false);
      setConfirmStatus(null);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeForm.description.trim()) { toast.error('Description is required'); return; }
    if (chargeForm.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    setBillingLoading(true);
    try {
      await apiClient.post(`/reservations/${id}/charges`, {
        description: chargeForm.description,
        quantity: Number(chargeForm.quantity),
        amount: Number(chargeForm.amount),
        type: chargeForm.type,
      });
      toast.success('Charge added successfully');
      setShowAddCharge(false);
      setChargeForm({ description: '', quantity: 1, amount: 0, type: 'EXTRA_BED' });
      await fetchReservation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add charge');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDeleteCharge = async (chargeId: string, description: string) => {
    setDeleteConfirm({ type: 'charge', id: chargeId, label: description });
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    setBillingLoading(true);
    try {
      await apiClient.post(`/reservations/${id}/payments`, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber || undefined,
        paidAt: new Date(paymentForm.paidAt).toISOString(),
      });
      toast.success('Payment recorded successfully');
      setShowAddPayment(false);
      setPaymentForm({
        amount: 0,
        method: 'CASH',
        referenceNumber: '',
        paidAt: new Date().toISOString().slice(0, 16),
      });
      await fetchReservation();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    setDeleteConfirm({ type: 'payment', id: paymentId, label: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} payment` });
  };

  const performDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      if (deleteConfirm.type === 'charge') {
        await apiClient.delete(`/reservations/${id}/charges/${deleteConfirm.id}`);
        toast.success('Charge removed');
      } else {
        await apiClient.delete(`/reservations/${id}/payments/${deleteConfirm.id}`);
        toast.success('Payment record removed');
      }
      await fetchReservation();
    } catch {
      toast.error(`Could not remove ${deleteConfirm.type}`);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(null);
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

  if (!reservation) return null;

  const nights = Math.max(1, Math.ceil(
    (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime())
    / (1000 * 60 * 60 * 24)
  ));
  const transitions = STATUS_TRANSITIONS[reservation.status] ?? [];

  // Billing summary defaults if backend didn't supply them
  const charges = reservation.charges ?? [];
  const payments = reservation.payments ?? [];
  const totalCharges = charges.reduce((sum, c) => sum + c.amount * c.quantity, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = totalCharges - totalPayments;
  const paymentStatus = reservation.billingSummary?.paymentStatus ?? (
    totalPayments === 0 ? 'UNPAID' : remainingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reservations" className="hover:text-foreground flex items-center gap-1 transition">
          <ArrowLeft className="w-4 h-4" /> Reservations
        </Link>
        <span>/</span>
        <span className="font-mono font-bold text-foreground">{reservation.reservationNumber}</span>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm font-bold text-muted-foreground">{reservation.reservationNumber}</span>
            </div>
            <h1 className="text-xl font-extrabold text-foreground">
              {reservation.holderFirstName} {reservation.holderLastName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{reservation.holderEmail}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{reservation.holderPhone}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <BillingStatusBadge status={paymentStatus} />
              <StatusBadge status={reservation.status} />
            </div>
            <span className="text-xs text-muted-foreground">
              Created {formatDate(reservation.createdAt)}
              {reservation.createdBy && ` by ${reservation.createdBy.firstName} ${reservation.createdBy.lastName}`}
            </span>
          </div>
        </div>

        {/* Status Actions */}
        {/* Status Actions */}
        <div className="mt-5 pt-5 border-t border-border space-y-4">
            {/* Primary action — visually prominent */}
            {reservation.status === 'CONFIRMED' && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Primary Action</p>
                <Link
                  href={`/dashboard/reservations/${id}/checkin`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Check-In Guest
                </Link>
              </div>
            )}
            {reservation.status === 'CHECKED_IN' && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Primary Action</p>
                <Link
                  href={remainingBalance > 0 ? '#' : `/dashboard/reservations/${id}/checkout`}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl shadow-md transition ${
                    remainingBalance > 0
                      ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'
                  }`}
                  onClick={(e) => {
                    if (remainingBalance > 0) {
                      e.preventDefault();
                      toast.error('Cannot check out: There is an outstanding balance.');
                    }
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Check-Out Guest
                </Link>
                {remainingBalance > 0 && (
                  <p className="text-xs text-rose-500 mt-2 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Balance must be paid before check-out
                  </p>
                )}
              </div>
            )}

            {/* Secondary / status transitions */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Actions & Documents</p>
              <div className="flex flex-wrap gap-2">
                {transitions
                  .filter((s) => !['CHECKED_IN', 'CHECKED_OUT'].includes(s))
                  .map((nextStatus) => {
                    const cfg = STATUS_CONFIG[nextStatus];
                    const isDestructive = ['CANCELLED', 'NO_SHOW'].includes(nextStatus);
                    return (
                      <button
                        key={nextStatus}
                        onClick={() => setConfirmStatus(nextStatus)}
                        disabled={statusLoading}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition disabled:opacity-60 ${
                          isDestructive
                            ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/40'
                            : `${cfg.color} ${cfg.bg} ${cfg.border} hover:opacity-90`
                        }`}
                      >
                        {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Mark as {cfg.label}
                      </button>
                    );
                  })}

                {/* Print Documents */}
                <Link
                  href={`/dashboard/reservations/${id}/documents/reservation-form`}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Guest Form
                </Link>

                {/* Slip reprints */}
                {['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(reservation.status) && (
                  <Link
                    href={`/dashboard/reservations/${id}/checkin/slip`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Check-In Slip
                  </Link>
                )}
                {['CHECKED_OUT', 'COMPLETED'].includes(reservation.status) && (
                  <Link
                    href={`/dashboard/reservations/${id}/checkout/slip`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Check-Out Slip
                  </Link>
                )}

                {!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status) && (
                  <Link
                    href={`/dashboard/reservations/${id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-accent transition"
                  >
                    Edit Details
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Tabs selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition ${
            activeTab === 'details'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Stay Details
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'billing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Billing & Payments
        </button>
      </div>

      {/* TAB: Stay Details */}
      {activeTab === 'details' && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left col: dates + notes */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Stay Dates
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Check-in</p>
                  <p className="text-sm font-bold text-foreground">{formatDateOnly(reservation.checkInDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Check-out</p>
                  <p className="text-sm font-bold text-foreground">{formatDateOnly(reservation.checkOutDate)}</p>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="text-sm font-extrabold">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Room Charges</span>
                  <span className="text-base font-extrabold text-primary">₱{totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {reservation.notes && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" /> Notes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* Right col: facilities + occupants */}
          <div className="md:col-span-2 space-y-4">
            {/* Facilities */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/50">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Reserved Facilities</span>
                <span className="ml-auto text-xs text-muted-foreground">{reservation.facilities.length} unit{reservation.facilities.length !== 1 ? 's' : ''}</span>
              </div>
              {reservation.facilities.map((rf, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {rf.facility.facilityCode}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border text-muted-foreground">
                        {rf.facility.facilityType.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {rf.facility.building}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">₱{rf.rateApplied.toLocaleString()}/night</div>
                    <div className="text-xs text-muted-foreground">×{nights}N = ₱{(rf.rateApplied * nights).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Occupants */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/50">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Occupants</span>
                <span className="ml-auto text-xs text-muted-foreground">{reservation.occupants.length} guest{reservation.occupants.length !== 1 ? 's' : ''}</span>
              </div>
              {reservation.occupants.length === 0 ? (
                <div className="px-5 py-6 text-sm text-muted-foreground text-center">No occupants registered.</div>
              ) : (
                reservation.occupants.map((occ) => (
                  <div key={occ.id} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {occ.firstName[0]}{occ.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{occ.firstName} {occ.lastName}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {occ.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{occ.email}</span>}
                        {occ.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{occ.phone}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Billing & Payments */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Summary Strip Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-blue-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total Charges</p>
                <p className="text-xl font-black text-foreground">₱{totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total Payments</p>
                <p className="text-xl font-black text-foreground">₱{totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-lg border ${
                remainingBalance <= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 text-emerald-600'
                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900 text-rose-600'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Remaining Balance</p>
                <p className="text-xl font-black text-foreground">₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Charges Grid list */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/50">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Billing Breakdown (Charges)</span>
              <button
                onClick={() => setShowAddCharge(true)}
                className="ml-auto flex items-center gap-1 px-3 py-1 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Charge
              </button>
            </div>
            {charges.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No charges recorded.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-3 pl-5">Description</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {charges.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/10 transition-colors">
                      <td className="p-3 pl-5 font-semibold text-foreground">{c.description}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-muted border border-border text-xs font-medium text-muted-foreground">
                          {CHARGE_TYPE_LABELS[c.type] ?? c.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">₱{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center text-muted-foreground font-semibold">{c.quantity}</td>
                      <td className="p-3 text-right font-bold text-foreground">₱{(c.amount * c.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteCharge(c.id, c.description)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Remove Charge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payments list */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/50">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Payments History</span>
              <button
                onClick={() => setShowAddPayment(true)}
                className="ml-auto flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Payment
              </button>
            </div>
            {payments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-3 pl-5">Date Paid</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Reference Number</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/10 transition-colors">
                      <td className="p-3 pl-5 text-muted-foreground">{formatDate(p.paidAt)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground text-xs">{p.referenceNumber || 'N/A'}</td>
                      <td className="p-3 text-right font-black text-foreground">₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeletePayment(p.id, p.amount)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete Payment Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Status change confirmation overlay */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmStatus(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            {['CANCELLED', 'NO_SHOW'].includes(confirmStatus) ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold">Confirm Status Change</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Mark this reservation as <strong>{STATUS_CONFIG[confirmStatus].label}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Confirm Status Change</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Update status to <strong>{STATUS_CONFIG[confirmStatus].label}</strong>?
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button
                onClick={() => setConfirmStatus(null)}
                className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
              >
                Cancel
              </button>
              <button
                onClick={() => performStatusChange(confirmStatus)}
                disabled={statusLoading}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shadow transition disabled:opacity-75 ${
                  ['CANCELLED', 'NO_SHOW'].includes(confirmStatus)
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                {statusLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Charge */}
      {showAddCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddCharge(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4 z-10">
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add Billing Charge
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Record a manual charge towards this reservation billing ledger.</p>
            </div>

            <form onSubmit={handleAddCharge} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Charge Description *</label>
                <input
                  type="text"
                  required
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  placeholder="e.g. Early Check-In request, Extra pillow sets..."
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Charge Type *</label>
                  <select
                    value={chargeForm.type}
                    onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(CHARGE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={chargeForm.quantity}
                    onChange={(e) => setChargeForm({ ...chargeForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Price per item (PHP) *</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={chargeForm.amount || ''}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: Number(e.target.value) })}
                  placeholder="PHP"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddCharge(false)}
                  className="px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={billingLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold rounded-lg shadow disabled:opacity-75"
                >
                  {billingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Payment */}
      {showAddPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddPayment(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4 z-10">
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Record Payment
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Apply a payment towards this reservation's remaining balance.</p>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount Paid (PHP) *</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  placeholder="PHP"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Method *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date Paid *</label>
                  <input
                    type="datetime-local"
                    required
                    value={paymentForm.paidAt}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  placeholder="e.g. Receipt/PO Reference..."
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="px-4 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={billingLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow disabled:opacity-75"
                >
                  {billingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleteLoading && setDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold">Remove {deleteConfirm.type === 'charge' ? 'Charge' : 'Payment'}?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{deleteConfirm.label}</span> will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg shadow transition disabled:opacity-75"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
