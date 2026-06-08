'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Loader2,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface FacilityType { name: string; defaultRate: number; baseCapacity: number; maxCapacity: number; }
interface Facility { id: string; facilityCode: string; building: string; isActive: boolean; facilityType: FacilityType; }
interface Occupant { firstName: string; lastName: string; email: string; phone: string; }
interface Reservation {
  id: string;
  reservationNumber: string;
  holderFirstName: string;
  holderLastName: string;
  holderEmail: string;
  holderPhone: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  facilities: { facilityId: string; facility: Facility }[];
  occupants: Occupant[];
}

export default function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  // Form fields
  const [holder, setHolder] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [notes, setNotes] = useState('');
  const [occupants, setOccupants] = useState<Occupant[]>([{ firstName: '', lastName: '', email: '', phone: '' }]);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/reservations/${id}`),
      apiClient.get('/facilities', { params: { isActive: true, limit: 100 } }),
    ])
      .then(([resRes, facRes]) => {
        const r: Reservation = resRes.data;
        setReservation(r);
        setHolder({
          firstName: r.holderFirstName,
          lastName: r.holderLastName,
          email: r.holderEmail,
          phone: r.holderPhone,
        });
        setSelectedFacilityIds(r.facilities.map((rf) => rf.facilityId));
        setCheckInDate(r.checkInDate.slice(0, 10));
        setCheckOutDate(r.checkOutDate.slice(0, 10));
        setNotes(r.notes || '');
        setOccupants(
          r.occupants.length > 0
            ? r.occupants.map((o) => ({
                firstName: o.firstName,
                lastName: o.lastName,
                email: o.email || '',
                phone: o.phone || '',
              }))
            : [{ firstName: '', lastName: '', email: '', phone: '' }]
        );
        setAllFacilities(facRes.data.data);
      })
      .catch(() => {
        toast.error('Could not load reservation data');
        router.push('/dashboard/reservations');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const nights = (() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const selectedFacilities = allFacilities.filter((f) => selectedFacilityIds.includes(f.id));
  const totalAmount = selectedFacilities.reduce((sum, f) => sum + f.facilityType.defaultRate * Math.max(1, nights), 0);

  const toggleFacility = (id: string) =>
    setSelectedFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const addOccupant = () =>
    setOccupants((prev) => [...prev, { firstName: '', lastName: '', email: '', phone: '' }]);

  const removeOccupant = (idx: number) =>
    setOccupants((prev) => prev.filter((_, i) => i !== idx));

  const updateOccupant = (idx: number, field: keyof Occupant, value: string) =>
    setOccupants((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nights <= 0) { toast.error('Check-out must be after check-in'); return; }
    if (selectedFacilityIds.length === 0) { toast.error('Select at least one facility'); return; }
    if (occupants.some((o) => !o.firstName || !o.lastName)) { toast.error('All occupant names are required'); return; }

    setSubmitting(true);
    try {
      await apiClient.patch(`/reservations/${id}`, {
        holderFirstName: holder.firstName,
        holderLastName: holder.lastName,
        holderEmail: holder.email,
        holderPhone: holder.phone,
        checkInDate: new Date(checkInDate).toISOString(),
        checkOutDate: new Date(checkOutDate).toISOString(),
        notes: notes || undefined,
        facilityIds: selectedFacilityIds,
        occupants: occupants.filter((o) => o.firstName && o.lastName),
      });
      toast.success('Reservation updated successfully');
      router.push(`/dashboard/reservations/${id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading reservation…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/dashboard/reservations/${id}`} className="hover:text-foreground flex items-center gap-1 transition">
          <ArrowLeft className="w-4 h-4" /> {reservation?.reservationNumber}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Edit</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Edit Reservation</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Holder Info */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" /> Reservation Holder
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name *</label>
              <input type="text" required value={holder.firstName} onChange={(e) => setHolder({ ...holder, firstName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input type="text" required value={holder.lastName} onChange={(e) => setHolder({ ...holder, lastName: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" required value={holder.email} onChange={(e) => setHolder({ ...holder, email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input type="tel" required value={holder.phone} onChange={(e) => setHolder({ ...holder, phone: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}><StickyNote className="inline w-3.5 h-3.5 mr-1" />Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Facilities */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Facilities
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {allFacilities.map((fac) => {
              const selected = selectedFacilityIds.includes(fac.id);
              return (
                <button
                  key={fac.id}
                  type="button"
                  onClick={() => toggleFacility(fac.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all hover:-translate-y-px ${
                    selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{fac.facilityCode}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {fac.building}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">{fac.facilityType.name}</span>
                      <div className="text-xs font-bold text-primary mt-1">₱{fac.facilityType.defaultRate.toLocaleString()}/night</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base">Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Check-in *</label>
              <input type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Check-out *</label>
              <input type="date" required value={checkOutDate} min={checkInDate} onChange={(e) => setCheckOutDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          {nights > 0 && (
            <div className="bg-muted rounded-lg border border-border p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''} × {selectedFacilityIds.length} unit{selectedFacilityIds.length !== 1 ? 's' : ''}</span>
              <span className="font-extrabold text-primary">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        {/* Occupants */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Occupants
            </h2>
            <button type="button" onClick={addOccupant} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/20 transition">
              <Plus className="w-3.5 h-3.5" /> Add Guest
            </button>
          </div>
          {occupants.map((occ, idx) => (
            <div key={idx} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Guest #{idx + 1}</span>
                {occupants.length > 1 && (
                  <button type="button" onClick={() => removeOccupant(idx)} className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input type="text" required value={occ.firstName} onChange={(e) => updateOccupant(idx, 'firstName', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input type="text" required value={occ.lastName} onChange={(e) => updateOccupant(idx, 'lastName', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={occ.email} onChange={(e) => updateOccupant(idx, 'email', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={occ.phone} onChange={(e) => updateOccupant(idx, 'phone', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/reservations/${id}`} className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition text-muted-foreground">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg shadow disabled:opacity-75 transition"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
