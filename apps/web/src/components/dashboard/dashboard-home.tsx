'use client';

import { useAuth } from '@/contexts/auth.context';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import {
  Shield,
  Users,
  Building2,
  TrendingUp,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Loader2,
  RefreshCw,
  MapPin,
  Search,
  XCircle,
  Wrench,
  CalendarDays,
  ExternalLink,
  Clock,
  LogIn,
  LogOut,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */
interface DashboardStats {
  totalFacilities: number;
  occupiedFacilities: number;
  availableFacilities: number;
  pendingReservations: number;
}

type AvailabilityStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

interface FacilityAvailability {
  id: string;
  facilityCode: string;
  building: string;
  facilityType: { name: string; baseCapacity: number; maxCapacity: number; defaultRate: number };
  status: AvailabilityStatus;
}

interface TodayReservation {
  id: string;
  reservationNumber: string;
  holderFirstName: string;
  holderLastName: string;
  holderPhone: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  facilities: { facility: { facilityCode: string; building: string } }[];
}

const AVAIL_STATUS_CFG: Record<AvailabilityStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  AVAILABLE:   { label: 'Available',   icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  border: 'border-emerald-200 dark:border-emerald-900' },
  RESERVED:    { label: 'Reserved',    icon: <Clock        className="w-3.5 h-3.5" />, color: 'text-amber-700  dark:text-amber-400',   bg: 'bg-amber-50  dark:bg-amber-950/30',   border: 'border-amber-200  dark:border-amber-900'  },
  OCCUPIED:    { label: 'Occupied',    icon: <XCircle      className="w-3.5 h-3.5" />, color: 'text-rose-700  dark:text-rose-400',    bg: 'bg-rose-50   dark:bg-rose-950/30',    border: 'border-rose-200   dark:border-rose-900'   },
  MAINTENANCE: { label: 'Maintenance', icon: <Wrench       className="w-3.5 h-3.5" />, color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-50  dark:bg-slate-800/40',   border: 'border-slate-200  dark:border-slate-700'  },
};


/* ─── Helpers ────────────────────────────────────────────────── */
function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}



/* ─── Main Component ─────────────────────────────────────────── */
export function DashboardHome() {
  const { user } = useAuth();
  const isManager = user?.role === 'HOSTEL_MANAGER';

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);


  // Quick availability widget
  const [availCheckIn, setAvailCheckIn]   = useState(toLocalDateStr(new Date()));
  const [availCheckOut, setAvailCheckOut] = useState(toLocalDateStr(new Date(Date.now() + 86400000)));
  const [availFacilities, setAvailFacilities] = useState<FacilityAvailability[]>([]);
  const [availLoading, setAvailLoading]   = useState(false);
  const [availSearched, setAvailSearched] = useState(false);

  // Today's arrivals & departures
  const [todayArrivals, setTodayArrivals] = useState<TodayReservation[]>([]);
  const [todayDepartures, setTodayDepartures] = useState<TodayReservation[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  const availNights = Math.max(0, Math.ceil(
    (new Date(availCheckOut).getTime() - new Date(availCheckIn).getTime()) / 86400000,
  ));

  const handleAvailSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(availCheckOut) <= new Date(availCheckIn)) return;
    setAvailLoading(true);
    try {
      const res = await apiClient.get('/facilities/availability', {
        params: { checkIn: availCheckIn, checkOut: availCheckOut },
      });
      setAvailFacilities(res.data);
      setAvailSearched(true);
    } catch {
      // silently fail on dashboard widget
    } finally {
      setAvailLoading(false);
    }
  };

  const availStats = availSearched ? {
    AVAILABLE:   availFacilities.filter(f => f.status === 'AVAILABLE').length,
    RESERVED:    availFacilities.filter(f => f.status === 'RESERVED').length,
    OCCUPIED:    availFacilities.filter(f => f.status === 'OCCUPIED').length,
    MAINTENANCE: availFacilities.filter(f => f.status === 'MAINTENANCE').length,
  } : null;

  const availableList = availFacilities.filter(f => f.status === 'AVAILABLE').slice(0, 6);

  const fetchAll = useCallback(async () => {
    setStatsLoading(true);
    setTodayLoading(true);

    const today = toLocalDateStr(new Date());

    const [facRes, occupiedRes, pendingRes, arrivalsRes, departuresRes] = await Promise.all([
      apiClient.get('/facilities', { params: { isActive: true, limit: 1 } }).catch(() => null),
      apiClient.get('/reservations', { params: { status: 'CHECKED_IN', limit: 1 } }).catch(() => null),
      apiClient.get('/reservations', { params: { status: 'PENDING', limit: 1 } }).catch(() => null),
      apiClient.get('/reservations', { params: { checkInFrom: today, checkInTo: today, limit: 20 } }).catch(() => null),
      apiClient.get('/reservations', { params: { status: 'CHECKED_IN', limit: 50 } }).catch(() => null),
    ]);

    setStats({
      totalFacilities: facRes?.data?.total ?? facRes?.data?.meta?.total ?? 0,
      occupiedFacilities: occupiedRes?.data?.total ?? occupiedRes?.data?.meta?.total ?? 0,
      availableFacilities: Math.max(
        0,
        (facRes?.data?.total ?? facRes?.data?.meta?.total ?? 0) -
        (occupiedRes?.data?.total ?? occupiedRes?.data?.meta?.total ?? 0),
      ),
      pendingReservations: pendingRes?.data?.meta?.total ?? pendingRes?.data?.total ?? 0,
    });

    // Today arrivals: reservations with checkInDate = today (any non-cancelled status)
    setTodayArrivals(
      (arrivalsRes?.data?.data ?? []).filter((r: TodayReservation) =>
        !['CANCELLED', 'NO_SHOW'].includes(r.status)
      )
    );

    // Today departures: checked-in reservations with checkOutDate = today
    setTodayDepartures(
      (departuresRes?.data?.data ?? []).filter((r: TodayReservation) =>
        toLocalDateStr(new Date(r.checkOutDate)) === today
      )
    );

    setStatsLoading(false);
    setTodayLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statCards = [
    {
      label: 'Total Facilities',
      value: statsLoading ? '…' : String(stats?.totalFacilities ?? 0),
      desc: 'Active rooms & halls',
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Checked In',
      value: statsLoading ? '…' : String(stats?.occupiedFacilities ?? 0),
      desc: 'Currently occupied',
      icon: <DoorOpen className="w-5 h-5" />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Available',
      value: statsLoading ? '…' : String(stats?.availableFacilities ?? 0),
      desc: 'Ready for guests',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-teal-500',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
    },
    {
      label: 'Pending',
      value: statsLoading ? '…' : String(stats?.pendingReservations ?? 0),
      desc: 'Awaiting confirmation',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Welcome Banner ──────────────────────────────────── */}
      <div className="relative rounded-2xl p-6 sm:p-8 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }} />
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: '#10b981' }} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-200 border border-white/10">
              <Shield className="w-3.5 h-3.5" />
              {isManager ? 'Hostel Manager' : 'Front Desk Staff'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good <span suppressHydrationWarning>
                {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
              </span>,{' '}
              <span className="text-emerald-300">{user?.firstName || 'Staff'}</span>!
            </h2>
            <p className="text-sm text-emerald-200/70 max-w-lg">
              Here's your operational overview for today,{' '}
              <span suppressHydrationWarning className="font-semibold text-emerald-200">
                {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/dashboard/reservations/new"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: '#16a34a', color: 'white', boxShadow: '0 4px 14px rgba(22,163,74,0.4)' }}
            >
              <Plus className="w-4 h-4" />
              New Reservation
            </Link>
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/15 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {isManager && (
              <Link
                href="/dashboard/staff"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/15 transition"
              >
                <Users className="w-4 h-4" />
                Manage Staff
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl border ${stat.bg} ${stat.border} ${stat.color}`}>
                {stat.icon}
              </div>
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/40" />
            </div>
            <p className="text-3xl font-black text-foreground tabular-nums">{stat.value}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{stat.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Today's Arrivals & Departures ────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Arrivals */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-emerald-50/50 dark:bg-emerald-950/10">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
              <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Today's Arrivals</h3>
              <p className="text-[10px] text-muted-foreground">Expected check-ins for today</p>
            </div>
            <span className="ml-auto text-sm font-black text-emerald-600 dark:text-emerald-400">
              {todayLoading ? '…' : todayArrivals.length}
            </span>
          </div>
          {todayLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : todayArrivals.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No arrivals scheduled today.</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayArrivals.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/reservations/${r.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 transition group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {r.holderFirstName[0]}{r.holderLastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition">
                        {r.holderFirstName} {r.holderLastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.reservationNumber} · {r.facilities.map(f => f.facility.facilityCode).join(', ')}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'CHECKED_IN'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : r.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>{r.status.replace('_', ' ')}</span>
                  </Link>
                </li>
              ))}
              {todayArrivals.length > 5 && (
                <li className="px-5 py-2 text-xs text-center text-muted-foreground">
                  +{todayArrivals.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Departures */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-violet-50/50 dark:bg-violet-950/10">
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900">
              <LogOut className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Today's Departures</h3>
              <p className="text-[10px] text-muted-foreground">Guests checking out today</p>
            </div>
            <span className="ml-auto text-sm font-black text-violet-600 dark:text-violet-400">
              {todayLoading ? '…' : todayDepartures.length}
            </span>
          </div>
          {todayLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : todayDepartures.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No departures expected today.</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayDepartures.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/reservations/${r.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 transition group"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-violet-700 dark:text-violet-400">
                        {r.holderFirstName[0]}{r.holderLastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition">
                        {r.holderFirstName} {r.holderLastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.reservationNumber} · {r.facilities.map(f => f.facility.facilityCode).join(', ')}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/reservations/${r.id}/checkout`}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Check Out
                    </Link>
                  </Link>
                </li>
              ))}
              {todayDepartures.length > 5 && (
                <li className="px-5 py-2 text-xs text-center text-muted-foreground">
                  +{todayDepartures.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* ── Quick Availability Check ─────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100">
              <CalendarDays className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Quick Availability Check</h3>
              <p className="text-[10px] text-muted-foreground">Search facility availability by date</p>
            </div>
          </div>
          <Link
            href="/dashboard/availability"
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            Full page <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        </div>

        {/* Search form */}
        <form onSubmit={handleAvailSearch} className="px-5 py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Check-in</label>
              <input
                type="date"
                required
                value={availCheckIn}
                min={toLocalDateStr(new Date())}
                onChange={(e) => setAvailCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Check-out</label>
              <input
                type="date"
                required
                value={availCheckOut}
                min={availCheckIn || toLocalDateStr(new Date())}
                onChange={(e) => setAvailCheckOut(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
            {availNights > 0 && (
              <div className="px-3 py-2 rounded-lg border border-border bg-muted text-xs font-bold text-muted-foreground whitespace-nowrap flex-shrink-0">
                {availNights}N
              </div>
            )}
            <button
              type="submit"
              disabled={availLoading}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg shadow transition flex-shrink-0 disabled:opacity-70"
            >
              {availLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        {availSearched && availStats && (
          <div className="px-5 pb-5 space-y-4">
            {/* Status summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.entries(AVAIL_STATUS_CFG) as [AvailabilityStatus, typeof AVAIL_STATUS_CFG[AvailabilityStatus]][]).map(([key, cfg]) => (
                <div
                  key={key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${cfg.bg} ${cfg.border}`}
                >
                  <span className={cfg.color}>{cfg.icon}</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">{cfg.label}</p>
                    <p className="text-lg font-extrabold text-foreground tabular-nums">{availStats[key]}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Available facilities list */}
            {availableList.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Available Facilities
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableList.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-background hover:bg-accent/30 transition"
                    >
                      <div className="p-1.5 rounded-md bg-emerald-50 border border-emerald-100 flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{f.facilityCode}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{f.building} · {f.facilityType.name}
                        </p>
                      </div>
                      <span className="ml-auto text-xs font-bold text-foreground whitespace-nowrap">
                        ₱{f.facilityType.defaultRate.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {availableList.length} of {availStats.AVAILABLE} available
                  </p>
                  <Link
                    href={`/dashboard/availability`}
                    className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    View all & book <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <XCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No available facilities</p>
                <p className="text-xs text-muted-foreground mt-0.5">Try different dates.</p>
              </div>
            )}
          </div>
        )}

        {/* Pre-search hint */}
        {!availSearched && !availLoading && (
          <div className="text-center py-8 px-5">
            <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Select dates above and click Search</p>
          </div>
        )}
      </div>


    </div>
  );
}
