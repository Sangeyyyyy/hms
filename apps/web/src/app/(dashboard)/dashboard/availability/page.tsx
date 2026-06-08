'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Search,
  Building2,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  Loader2,
  ArrowRight,
  CalendarDays,
  Info,
  LayoutGrid,
  LayoutList,
  Filter,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type AvailabilityStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

interface FacilityType {
  name: string;
  baseCapacity: number;
  maxCapacity: number;
  defaultRate: number;
}

interface FacilityAvailability {
  id: string;
  facilityCode: string;
  building: string;
  isActive: boolean;
  facilityType: FacilityType;
  status: AvailabilityStatus;
  conflictingReservations: {
    id: string;
    reservationNumber: string;
    status: string;
    checkInDate: string;
    checkOutDate: string;
    holderFirstName: string;
    holderLastName: string;
  }[];
}

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string; selectable: boolean }
> = {
  AVAILABLE: {
    label: 'Available',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900',
    selectable: true,
  },
  RESERVED: {
    label: 'Reserved',
    icon: <Clock className="w-3.5 h-3.5" />,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900',
    selectable: false,
  },
  OCCUPIED: {
    label: 'Occupied',
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-900',
    selectable: false,
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/40',
    border: 'border-slate-200 dark:border-slate-700',
    selectable: false,
  },
};

function StatusBadge({ status }: { status: AvailabilityStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function AvailabilityPage() {
  const router = useRouter();

  // Date inputs
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);

  // Results state
  const [facilities, setFacilities] = useState<FacilityAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // UI view & filter state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatus | ''>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) { toast.error('Please select both dates'); return; }
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error('Check-out must be after check-in'); return;
    }
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await apiClient.get('/facilities/availability', {
        params: { checkIn, checkOut },
      });
      setFacilities(res.data);
      setSearched(true);
    } catch {
      toast.error('Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string, status: AvailabilityStatus) => {
    if (!STATUS_CONFIG[status].selectable) {
      toast.error('This facility is not available for the selected dates');
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const nights = Math.max(0, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));

  const selectedFacilities = facilities.filter((f) => selectedIds.includes(f.id));
  const estimatedTotal = selectedFacilities.reduce(
    (sum, f) => sum + f.facilityType.defaultRate * Math.max(1, nights), 0
  );

  const uniqueTypes = Array.from(new Set(facilities.map((f) => f.facilityType.name)));

  const filteredFacilities = facilities.filter((f) => {
    if (typeFilter && f.facilityType.name !== typeFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  const proceedToBook = () => {
    if (selectedIds.length === 0) { toast.error('Select at least one available facility'); return; }
    // Store selection in sessionStorage for the new reservation page
    sessionStorage.setItem('preselected_facility_ids', JSON.stringify(selectedIds));
    sessionStorage.setItem('preselected_checkin', checkIn);
    sessionStorage.setItem('preselected_checkout', checkOut);
    router.push('/dashboard/reservations/new');
  };

  // Stats summary
  const stats = searched ? {
    available: facilities.filter((f) => f.status === 'AVAILABLE').length,
    reserved:  facilities.filter((f) => f.status === 'RESERVED').length,
    occupied:  facilities.filter((f) => f.status === 'OCCUPIED').length,
    maintenance: facilities.filter((f) => f.status === 'MAINTENANCE').length,
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          Facility Availability
        </h1>
        <p className="text-muted-foreground mt-1">
          Select dates to see which facilities are available for booking.
        </p>
      </div>

      {/* Date Search Form */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
        <form onSubmit={handleSearch} className="relative z-10">
          <h2 className="text-foreground font-bold text-lg mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Check Availability
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Check-in Date</label>
              <input
                type="date"
                required
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Check-out Date</label>
              <input
                type="date"
                required
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
            {nights > 0 && (
              <div className="text-center px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm font-bold whitespace-nowrap flex-shrink-0">
                {nights} night{nights !== 1 ? 's' : ''}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-sm disabled:opacity-75 transition flex-shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {searched && (
        <>
          {/* Summary stats strip */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(STATUS_CONFIG) as [AvailabilityStatus, typeof STATUS_CONFIG[AvailabilityStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition hover:-translate-y-px hover:shadow-md ${
                    statusFilter === key ? `${cfg.bg} ${cfg.border}` : 'bg-card border-border'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                    <span className={cfg.color}>{cfg.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{cfg.label}</p>
                    <p className="text-xl font-extrabold text-foreground">
                      {stats[key.toLowerCase() as keyof typeof stats] ?? 0}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Filter & view toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Types</option>
                {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {(typeFilter || statusFilter) && (
                <button
                  onClick={() => { setTypeFilter(''); setStatusFilter(''); }}
                  className="px-3 py-1.5 text-xs text-rose-600 border border-rose-200 dark:border-rose-900 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{filteredFacilities.length} facilities</span>
              <div className="flex gap-1 bg-muted rounded-lg p-1 border border-border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Facilities Grid/List */}
          {filteredFacilities.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-base font-semibold">No facilities match your filters</h3>
              <p className="text-sm text-muted-foreground mt-1">Try clearing the filters above.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFacilities.map((facility) => {
                const cfg = STATUS_CONFIG[facility.status];
                const isSelected = selectedIds.includes(facility.id);
                const isSelectable = cfg.selectable;
                const nightCount = Math.max(1, nights);

                return (
                  <div
                    key={facility.id}
                    onClick={() => toggleSelection(facility.id, facility.status)}
                    className={`relative rounded-xl border-2 p-5 transition-all group ${
                      isSelected
                        ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
                        : isSelectable
                        ? 'border-border bg-card hover:border-primary/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5'
                        : 'border-border bg-card opacity-75 cursor-not-allowed'
                    }`}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    {/* Card header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
                        <Building2 className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-tight">
                          {facility.facilityCode}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {facility.building}
                        </div>
                      </div>
                    </div>

                    {/* Type badge */}
                    <div className="mb-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-muted border border-border text-xs font-semibold text-muted-foreground">
                        {facility.facilityType.name}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {facility.facilityType.baseCapacity}–{facility.facilityType.maxCapacity} guests
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-bold text-foreground">
                          ₱{facility.facilityType.defaultRate.toLocaleString()}/night
                        </span>
                      </div>
                    </div>

                    {/* Subtotal for selected dates */}
                    {isSelectable && (
                      <div className="text-xs text-muted-foreground mb-3">
                        <span className="font-semibold text-foreground">Estimated: </span>
                        ₱{(facility.facilityType.defaultRate * nightCount).toLocaleString(undefined, { minimumFractionDigits: 2 })} for {nightCount}N
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <StatusBadge status={facility.status} />
                      {isSelectable && !isSelected && (
                        <span className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition">
                          Click to select
                        </span>
                      )}
                    </div>

                    {/* Conflict info */}
                    {facility.conflictingReservations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide flex items-center gap-1">
                          <Info className="w-3 h-3" /> Existing booking
                        </p>
                        {facility.conflictingReservations.slice(0, 2).map((res) => (
                          <Link
                            key={res.id}
                            href={`/dashboard/reservations/${res.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block text-[10px] text-muted-foreground hover:text-primary transition truncate font-mono"
                          >
                            {res.reservationNumber} · {res.holderFirstName} {res.holderLastName}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-sm text-left">
                <thead className="bg-muted text-muted-foreground border-b border-border font-medium text-xs uppercase tracking-wide">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Facility</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFacilities.map((facility) => {
                    const cfg = STATUS_CONFIG[facility.status];
                    const isSelected = selectedIds.includes(facility.id);
                    return (
                      <tr
                        key={facility.id}
                        onClick={() => toggleSelection(facility.id, facility.status)}
                        className={`transition-colors ${
                          cfg.selectable ? 'cursor-pointer hover:bg-accent/30' : 'opacity-70 cursor-not-allowed'
                        } ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <td className="p-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                            isSelected ? 'bg-primary border-primary' : 'border-input'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-foreground">{facility.facilityCode}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{facility.building}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-muted border border-border text-xs font-semibold text-muted-foreground">
                            {facility.facilityType.name}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-medium text-foreground">
                          {facility.facilityType.baseCapacity}–{facility.facilityType.maxCapacity}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          ₱{facility.facilityType.defaultRate.toLocaleString()}/night
                        </td>
                        <td className="p-3">
                          <StatusBadge status={facility.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Facilities Summary & Book Button */}
          {selectedIds.length > 0 && (
            <div className="sticky bottom-4 z-20">
              <div className="bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 p-4 flex flex-col sm:flex-row items-center gap-4 ring-1 ring-primary/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedFacilities.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary"
                      >
                        <Building2 className="w-3 h-3" />
                        {f.facilityCode}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedIds.length} facility unit{selectedIds.length !== 1 ? 's' : ''} selected ·{' '}
                    <span className="font-bold text-foreground">
                      ₱{estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} est. total
                    </span>{' '}
                    for {nights} night{nights !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={proceedToBook}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl shadow-lg transition flex-shrink-0"
                >
                  Book Selected <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state before search */}
      {!searched && !loading && (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Enter dates to check availability</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Select a check-in and check-out date above, then click Search to see which facilities are available for your dates.
          </p>
        </div>
      )}
    </div>
  );
}
