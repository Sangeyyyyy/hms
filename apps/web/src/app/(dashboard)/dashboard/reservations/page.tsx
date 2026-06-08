'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Calendar,
  Plus,
  Search,
  Eye,
  Edit2,
  Loader2,
  ChevronDown,
  Users,
  Building2,
  Clock,
  X,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type ReservationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

interface FacilityType { name: string; }
interface Facility { facilityCode: string; building: string; facilityType: FacilityType; }
interface ReservationFacility { facility: Facility; rateApplied: number; }
interface Occupant { id: string; firstName: string; lastName: string; email?: string; phone?: string; }

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
  facilities: ReservationFacility[];
  occupants: Occupant[];
}

const STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  DRAFT:       { label: 'Draft',       color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800/40',   border: 'border-slate-200 dark:border-slate-700' },
  PENDING:     { label: 'Pending',     color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-200 dark:border-amber-900' },
  CONFIRMED:   { label: 'Confirmed',   color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/30',      border: 'border-blue-200 dark:border-blue-900' },
  CHECKED_IN:  { label: 'Checked In',  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900' },
  CHECKED_OUT: { label: 'Checked Out', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30',  border: 'border-violet-200 dark:border-violet-900' },
  COMPLETED:   { label: 'Completed',   color: 'text-teal-700 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-950/30',      border: 'border-teal-200 dark:border-teal-900' },
  CANCELLED:   { label: 'Cancelled',   color: 'text-rose-700 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-950/30',      border: 'border-rose-200 dark:border-rose-900' },
  NO_SHOW:     { label: 'No Show',     color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30',  border: 'border-orange-200 dark:border-orange-900' },
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function getDurationDays(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({
    PENDING: 0,
    CONFIRMED: 0,
    CHECKED_IN: 0,
    CHECKED_OUT: 0,
  });

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: currentPage, limit: 10 };
      if (searchQuery)  params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom)     params.checkInFrom = dateFrom;
      const res = await apiClient.get('/reservations', { params });
      setReservations(res.data.data);
      setTotalPages(res.data.meta.totalPages);
      setTotalCount(res.data.meta.total);

      // Fetch accurate status counts matching current search/date filters
      const countParams = { limit: 1 };
      if (searchQuery)  Object.assign(countParams, { search: searchQuery });
      if (dateFrom)     Object.assign(countParams, { checkInFrom: dateFrom });

      const [pendingRes, confirmedRes, checkedInRes, checkedOutRes] = await Promise.all([
        apiClient.get('/reservations', { params: { ...countParams, status: 'PENDING' } }).catch(() => ({ data: { meta: { total: 0 } } })),
        apiClient.get('/reservations', { params: { ...countParams, status: 'CONFIRMED' } }).catch(() => ({ data: { meta: { total: 0 } } })),
        apiClient.get('/reservations', { params: { ...countParams, status: 'CHECKED_IN' } }).catch(() => ({ data: { meta: { total: 0 } } })),
        apiClient.get('/reservations', { params: { ...countParams, status: 'CHECKED_OUT' } }).catch(() => ({ data: { meta: { total: 0 } } })),
      ]);

      setCounts({
        PENDING: pendingRes.data?.meta?.total ?? 0,
        CONFIRMED: confirmedRes.data?.meta?.total ?? 0,
        CHECKED_IN: checkedInRes.data?.meta?.total ?? 0,
        CHECKED_OUT: checkedOutRes.data?.meta?.total ?? 0,
      });
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, dateFrom, searchQuery]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchQuery(search);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">Manage bookings, check-ins and check-outs.</p>
        </div>
        <Link
          href="/dashboard/reservations/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow transition"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] as ReservationStatus[]).map((s) => {
          const count = counts[s] ?? 0;
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setCurrentPage(1); }}
              className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition hover:-translate-y-px hover:shadow-md ${
                statusFilter === s ? `${cfg.bg} ${cfg.border}` : 'bg-card border-border'
              }`}
            >
              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              <span className="text-2xl font-extrabold text-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search HMS number, guest name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_CONFIG) as ReservationStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Check-in from"
            />
            <button type="submit" className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition">
              Filter
            </button>
            {(search || statusFilter || dateFrom) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setCurrentPage(1); }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-rose-600 border border-rose-200 dark:border-rose-900 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading reservations…</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-base font-semibold">No reservations found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or create a new reservation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b border-border font-medium text-xs uppercase tracking-wide">
                <tr>
                  <th className="p-4">Reservation #</th>
                  <th className="p-4">Guest / Holder</th>
                  <th className="p-4">Facilities</th>
                  <th className="p-4">Check-in</th>
                  <th className="p-4">Check-out</th>
                  <th className="p-4">Nights</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reservations.map((r) => {
                  const nights = getDurationDays(r.checkInDate, r.checkOutDate);
                  const totalRate = r.facilities.reduce((acc, rf) => acc + rf.rateApplied * nights, 0);
                  return (
                    <tr key={r.id} className="hover:bg-accent/30 transition-colors group">
                      <td className="p-4">
                        <span className="font-mono font-bold text-primary text-xs">{r.reservationNumber}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground">
                          {r.holderFirstName} {r.holderLastName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.holderEmail}</div>
                        <div className="text-xs text-muted-foreground">{r.holderPhone}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {r.facilities.map((rf) => (
                            <span
                              key={rf.facility.facilityCode}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted border border-border text-foreground"
                            >
                              <Building2 className="w-2.5 h-2.5" />
                              {rf.facility.facilityCode}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {r.occupants.length} occupant{r.occupants.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {formatDate(r.checkInDate)}
                      </td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {formatDate(r.checkOutDate)}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-foreground">{nights}N</div>
                        <div className="text-[10px] text-muted-foreground">
                          ₱{totalRate.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/dashboard/reservations/${r.id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(r.status) && (
                            <Link
                              href={`/dashboard/reservations/${r.id}/edit`}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                              title="Edit reservation"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4 bg-muted/40">
            <span className="text-xs text-muted-foreground">{totalCount} total reservations</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 bg-card border border-border text-xs rounded-lg hover:bg-accent disabled:opacity-50 transition">
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 bg-card border border-border text-xs rounded-lg hover:bg-accent disabled:opacity-50 transition">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
