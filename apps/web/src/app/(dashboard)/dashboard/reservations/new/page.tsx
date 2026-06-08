'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Building2,
  ChevronLeft,
  Loader2,
  Users,
  CalendarDays,
  MapPin,
  UserCircle,
  StickyNote,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface FacilityType { name: string; defaultRate: number; baseCapacity: number; maxCapacity: number; }
interface Facility {
  id: string;
  facilityCode: string;
  building: string;
  isActive: boolean;
  facilityType: FacilityType;
}

const STEPS = [
  { id: 1, label: 'Holder Info', icon: UserCircle },
  { id: 2, label: 'Dates',       icon: CalendarDays },
  { id: 3, label: 'Facilities',  icon: Building2 },
  { id: 4, label: 'Review',      icon: CheckCircle2 },
];

export default function NewReservationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Facilities data
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Form state
  const [holder, setHolder] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Philippines',
    gender: 'MALE',
    preferredContactMethod: 'EMAIL',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    functionHallPreferredTime: '',
    hasAvailedBefore: false,
    referralSource: ''
  });
  
  // PSGC API State
  const [psgcData, setPsgcData] = useState({ regions: [], provinces: [], cities: [] });
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [clientType, setClientType] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Read preselected state if redirected from Availability Search
    try {
      const storedIds = sessionStorage.getItem('preselected_facility_ids');
      const storedIn = sessionStorage.getItem('preselected_checkin');
      const storedOut = sessionStorage.getItem('preselected_checkout');
      if (storedIn) setCheckInDate(storedIn);
      if (storedOut) setCheckOutDate(storedOut);
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        if (Array.isArray(ids) && ids.length > 0) setSelectedFacilityIds(ids);
      }
      sessionStorage.removeItem('preselected_facility_ids');
      sessionStorage.removeItem('preselected_checkin');
      sessionStorage.removeItem('preselected_checkout');
    } catch (e) { console.warn('Error parsing preselected reservation data', e); }

    // Fetch PSGC Regions on mount
    fetch('https://psgc.gitlab.io/api/regions/')
      .then(res => res.json())
      .then(data => setPsgcData(prev => ({ ...prev, regions: data })))
      .catch(err => console.error('Failed to load regions', err));
  }, []);

  // Handle PSGC Region Change
  const handleRegionChange = async (regionCode: string, regionName: string) => {
    setSelectedRegion(regionCode);
    setHolder(h => ({ ...h, state: regionName, city: '' })); // Reset city when region changes
    setSelectedProvince('');
    try {
      const res = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
      const data = await res.json();
      setPsgcData(prev => ({ ...prev, provinces: data, cities: [] }));
      
      // If region has no provinces (like NCR), fetch cities directly
      if (data.length === 0) {
        const cityRes = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities/`);
        const cityData = await cityRes.json();
        setPsgcData(prev => ({ ...prev, cities: cityData }));
      }
    } catch (e) { console.error(e); }
  };

  // Handle PSGC Province Change
  const handleProvinceChange = async (provinceCode: string, provinceName: string) => {
    setSelectedProvince(provinceCode);
    setHolder(h => ({ ...h, state: provinceName, city: '' }));
    try {
      const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
      const data = await res.json();
      setPsgcData(prev => ({ ...prev, cities: data }));
    } catch (e) { console.error(e); }
  };

  // Load availability when both dates are set
  const loadAvailability = async (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return;
    setAvailabilityLoading(true);
    setSelectedFacilityIds([]); // reset selection when dates change
    try {
      const res = await apiClient.get('/facilities/availability', {
        params: { checkIn: new Date(checkIn).toISOString(), checkOut: new Date(checkOut).toISOString() },
      });
      setAvailableFacilities(res.data.filter((f: any) => f.status === 'AVAILABLE'));
    } catch {
      toast.error('Could not load availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Computed
  const selectedFacilities = availableFacilities.filter((f) =>
    selectedFacilityIds.includes(f.id)
  );

  const nights = (() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const totalAmount = selectedFacilities.reduce(
    (sum, f) => sum + f.facilityType.defaultRate * Math.max(1, nights),
    0
  );

  // Step validation
  const stepValid: Record<number, boolean> = {
    1: !!(holder.firstName && holder.lastName && holder.email && holder.phone),
    2: !!(checkInDate && checkOutDate && nights > 0),
    3: selectedFacilityIds.length > 0,
    4: true,
  };

  const toggleFacility = (id: string) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        holderFirstName: holder.firstName,
        holderLastName: holder.lastName,
        holderEmail: holder.email,
        holderPhone: holder.phone,
        checkInDate: new Date(checkInDate).toISOString(),
        checkOutDate: new Date(checkOutDate).toISOString(),
        notes: notes || undefined,
        facilityIds: selectedFacilityIds,
        occupants: [],
        clientType,
        holderAddress: holder.address,
        holderCity: holder.city,
        holderState: holder.state,
        holderZipCode: holder.zipCode,
        holderCountry: holder.country,
        holderGender: holder.gender,
        preferredContactMethod: holder.preferredContactMethod,
        emergencyContactName: holder.emergencyContactName,
        emergencyContactPhone: holder.emergencyContactPhone,
        emergencyContactRelation: holder.emergencyContactRelation,
        functionHallPreferredTime: holder.functionHallPreferredTime,
        hasAvailedBefore: holder.hasAvailedBefore,
        referralSource: holder.referralSource
      };
      const res = await apiClient.post('/reservations', payload);
      const num = res.data?.reservationNumber || '';
      toast.success(`Reservation ${num} created!`);
      router.push('/dashboard/reservations');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render helpers ---
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition';
  const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reservations" className="hover:text-foreground flex items-center gap-1 transition">
          <ChevronLeft className="w-4 h-4" /> Reservations
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New Reservation</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Reservation</h1>
        <p className="text-muted-foreground">Fill in each section, then submit to book facilities.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center w-full">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className={idx < STEPS.length - 1 ? "flex items-center flex-1" : "flex items-center"}>
              <button
                onClick={() => { if (done) setStep(s.id); }}
                className={`flex flex-col items-center gap-1 min-w-[60px] ${done ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    done
                      ? 'bg-primary border-primary text-primary-foreground'
                      : active
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground bg-muted'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${done ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: HOLDER INFO ─────────────────────────────── */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" /> Reservation Holder Details
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
          <div>
            <label className={labelCls}>Email Address *</label>
            <input type="email" required value={holder.email} onChange={(e) => setHolder({ ...holder, email: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client Type *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClientType('EXTERNAL')}
                  className={`flex-grow py-2 text-sm font-semibold rounded-lg border transition ${
                    clientType === 'EXTERNAL'
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'bg-background border-input text-muted-foreground hover:bg-accent'
                  }`}
                >
                  External
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('INTERNAL')}
                  className={`flex-grow py-2 text-sm font-semibold rounded-lg border transition ${
                    clientType === 'INTERNAL'
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'bg-background border-input text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Internal
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Phone Number *</label>
              <input type="tel" required placeholder="+639XXXXXXXXX" value={holder.phone} onChange={(e) => setHolder({ ...holder, phone: e.target.value })} className={inputCls} />
            </div>
          </div>

          <hr className="border-border my-6" />

          {/* Demographics & Contact */}
          <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><UserCircle className="w-4 h-4 text-primary"/> Personal Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Gender</label>
              <select value={holder.gender} onChange={(e) => setHolder({ ...holder, gender: e.target.value })} className={inputCls}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Preferred Contact Method</label>
              <select value={holder.preferredContactMethod} onChange={(e) => setHolder({ ...holder, preferredContactMethod: e.target.value })} className={inputCls}>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone Number</option>
              </select>
            </div>
          </div>

          <hr className="border-border my-6" />

          {/* Address Information */}
          <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary"/> Address Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Country</label>
              <select value={holder.country} onChange={(e) => setHolder({ ...holder, country: e.target.value })} className={inputCls}>
                <option value="Philippines">Philippines</option>
                <option value="International">International (Other)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Zip/Postal Code (Flexible)</label>
              <input type="text" placeholder="e.g. 8105 or AB1 2CD" value={holder.zipCode} onChange={(e) => setHolder({ ...holder, zipCode: e.target.value })} className={inputCls} />
            </div>
          </div>

          {holder.country === 'Philippines' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={labelCls}>Region</label>
                <select value={selectedRegion} onChange={(e) => handleRegionChange(e.target.value, e.target.options[e.target.selectedIndex].text)} className={inputCls}>
                  <option value="">Select Region</option>
                  {psgcData.regions.map((r: any) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Province / District</label>
                <select value={selectedProvince} onChange={(e) => handleProvinceChange(e.target.value, e.target.options[e.target.selectedIndex].text)} disabled={!selectedRegion || (psgcData.provinces.length === 0 && psgcData.cities.length > 0)} className={inputCls}>
                  <option value="">{psgcData.provinces.length === 0 && psgcData.cities.length > 0 ? 'N/A' : 'Select Province'}</option>
                  {psgcData.provinces.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>City / Municipality</label>
                <select value={holder.city} onChange={(e) => setHolder({ ...holder, city: e.target.value })} disabled={psgcData.cities.length === 0} className={inputCls}>
                  <option value="">Select City</option>
                  {psgcData.cities.map((c: any) => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>State / Province</label>
                <input type="text" value={holder.state} onChange={(e) => setHolder({ ...holder, state: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={holder.city} onChange={(e) => setHolder({ ...holder, city: e.target.value })} className={inputCls} />
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className={labelCls}>Street Address / Brgy</label>
            <input type="text" placeholder="House No., Street, Barangay" value={holder.address} onChange={(e) => setHolder({ ...holder, address: e.target.value })} className={inputCls} />
          </div>

          <hr className="border-border my-6" />

          {/* Emergency Contact */}
          <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-primary"/> Emergency / Other Contact</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input type="text" value={holder.emergencyContactName} onChange={(e) => setHolder({ ...holder, emergencyContactName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input type="tel" value={holder.emergencyContactPhone} onChange={(e) => setHolder({ ...holder, emergencyContactPhone: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Relationship</label>
              <input type="text" placeholder="e.g. Spouse, Parent" value={holder.emergencyContactRelation} onChange={(e) => setHolder({ ...holder, emergencyContactRelation: e.target.value })} className={inputCls} />
            </div>
          </div>

          <hr className="border-border my-6" />

          {/* Marketing & Background */}
          <h3 className="font-bold text-sm text-foreground mb-3">Background Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Have you availed our service before?</label>
              <select value={holder.hasAvailedBefore ? 'YES' : 'NO'} onChange={(e) => setHolder({ ...holder, hasAvailedBefore: e.target.value === 'YES' })} className={inputCls}>
                <option value="NO">No</option>
                <option value="YES">Yes</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>How did you hear about us?</label>
              <select value={holder.referralSource} onChange={(e) => setHolder({ ...holder, referralSource: e.target.value })} className={inputCls}>
                <option value="">Select...</option>
                <option value="Referral">Referral</option>
                <option value="Website">Website</option>
                <option value="Social Media">Social Media</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}><StickyNote className="inline w-3.5 h-3.5 mr-1" />Special Notes (Optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any requests, preferences, or important information…" className={`${inputCls} resize-none`} />
          </div>
        </div>
      )}

      {/* ── STEP 2: DATES ────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Choose Your Dates
          </h2>
          <p className="text-xs text-muted-foreground">Select your check-in and check-out dates. We'll then show you which facilities are available for those exact dates.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Check-in Date *</label>
              <input
                type="date"
                required
                value={checkInDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setCheckInDate(e.target.value);
                  if (checkOutDate) loadAvailability(e.target.value, checkOutDate);
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Check-out Date *</label>
              <input
                type="date"
                required
                value={checkOutDate}
                min={checkInDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setCheckOutDate(e.target.value);
                  if (checkInDate) loadAvailability(checkInDate, e.target.value);
                }}
                className={inputCls}
              />
            </div>
          </div>

          {nights > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between text-sm">
              <span className="text-primary font-semibold">Duration: {nights} night{nights !== 1 ? 's' : ''}</span>
              <span className="text-xs text-muted-foreground">Checking availability…</span>
            </div>
          )}

          {nights === 0 && checkInDate && checkOutDate && (
            <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Check-out date must be after check-in date.
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: FACILITIES (availability-filtered) ─────────── */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Available Facilities
          </h2>
          <p className="text-xs text-muted-foreground">
            Showing only facilities available from <strong>{checkInDate}</strong> to <strong>{checkOutDate}</strong>.
          </p>

          {availabilityLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Checking availability…</span>
            </div>
          ) : availableFacilities.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              No facilities are available for the selected dates. Please go back and choose different dates.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {availableFacilities.map((fac) => {
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
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {fac.facilityCode}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {fac.building}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                          {fac.facilityType.name}
                        </span>
                        <div className="text-xs font-bold text-primary mt-1">
                          ₱{fac.facilityType.defaultRate.toLocaleString()}/night
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span><Users className="inline w-3 h-3 mr-0.5" />{fac.facilityType.baseCapacity}–{fac.facilityType.maxCapacity} guests</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedFacilityIds.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary font-semibold">
              {selectedFacilityIds.length} facility unit{selectedFacilityIds.length > 1 ? 's' : ''} selected · Est. ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: REVIEW ──────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Review & Confirm
            </h2>

            {/* Holder */}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              <div className="px-4 py-2 bg-muted text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Reservation Holder
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name: </span><span className="font-semibold">{holder.firstName} {holder.lastName}</span></div>
                <div><span className="text-muted-foreground">Client Type: </span><span className="font-semibold uppercase">{clientType}</span></div>
                <div><span className="text-muted-foreground">Email: </span><span className="font-semibold">{holder.email}</span></div>
                <div><span className="text-muted-foreground">Phone: </span><span className="font-semibold">{holder.phone}</span></div>
                {notes && <div className="col-span-2"><span className="text-muted-foreground">Notes: </span><span className="font-semibold">{notes}</span></div>}
              </div>
            </div>

            {/* Facilities */}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              <div className="px-4 py-2 bg-muted text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Selected Facilities
              </div>
              {selectedFacilities.map((f) => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold">{f.facilityCode}</span>
                    <span className="ml-2 text-muted-foreground">{f.building}</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted border border-border font-medium">{f.facilityType.name}</span>
                  </div>
                  <span className="font-semibold text-primary">₱{f.facilityType.defaultRate.toLocaleString()}/night</span>
                </div>
              ))}
            </div>

            {/* Dates */}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              <div className="px-4 py-2 bg-muted text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Dates & Total
              </div>
              <div className="px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-semibold">{checkInDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-semibold">{checkOutDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="font-bold">Total Estimated</span>
                  <span className="font-extrabold text-primary text-base">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <Link
            href="/dashboard/reservations"
            className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" /> Cancel
          </Link>
        )}

        {step < 4 ? (
          <button
            type="button"
            disabled={!stepValid[step]}
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Continue <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow disabled:opacity-75 transition"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {submitting ? 'Submitting…' : 'Confirm Reservation'}
          </button>
        )}
      </div>
    </div>
  );
}
