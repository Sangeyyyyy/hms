'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';

interface Facility {
  facilityCode: string;
  building: string;
  facilityType: { name: string };
}

interface Occupant {
  id: string;
  firstName: string;
  lastName: string;
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
  holderAddress?: string;
  holderCity?: string;
  holderState?: string;
  holderZipCode?: string;
  holderCountry?: string;
  holderGender?: string;
  preferredContactMethod?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  functionHallPreferredTime?: string;
  hasAvailedBefore?: boolean;
  referralSource?: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  facilities: Array<{ facility: Facility; rateApplied: number }>;
  occupants: Occupant[];
  createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { dateStyle: 'long' });
}

export default function ReservationFormPage({ params }: { params: Promise<{ id: string }> }) {
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
        <p className="text-sm text-muted-foreground">Generating form…</p>
      </div>
    );
  }

  if (!reservation) return null;

  return (
    <>
      {/* Controls */}
      <div className="print:hidden max-w-[800px] mx-auto mb-6 flex items-center gap-3">
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
          <Printer className="w-4 h-4" /> Print Form
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-container { width: 100% !important; min-height: 100% !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
        }
      `}</style>

      {/* Form Sheet */}
      <div className="print-container w-[210mm] min-h-[297mm] mx-auto bg-white text-gray-900 border border-gray-200 shadow-md p-8 print:p-0 font-sans text-xs leading-tight relative flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="w-20 flex flex-col items-center">
            <img src="/logos/Hostel logo.png" alt="DNSC Hostel" className="w-full h-auto object-contain" />
          </div>

          <div className="text-center flex-1">
            <p className="font-bold text-xs tracking-[0.2em] mb-1 text-gray-800">DNSC HOSTEL</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary">RESERVATION FORM</h1>
          </div>

          <div className="w-20 flex items-center justify-end">
            <img src="/logos/BASD logo.png" alt="BASD" className="w-full h-auto object-contain" />
          </div>
        </div>

        <div className="mb-6 flex items-end gap-2 w-2/3">
          <span className="font-bold text-xs uppercase">Date of Transaction:</span>
          <span className="border-b border-gray-400 flex-1 text-xs pb-0.5">{formatDate(reservation.createdAt)}</span>
        </div>

        {/* Section 1: CLIENT INFORMATION */}
        <div className="mb-4">
          <div className="bg-primary text-white text-center font-bold py-1 mb-2 tracking-widest text-xs uppercase">
            Client Information
          </div>
          <div className="bg-gray-200/40 p-3 space-y-3">
            <div className="flex items-end gap-2">
              <span className="w-24 text-xs font-medium">Name:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderFirstName} {reservation.holderLastName}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-24 text-xs font-medium">Type of guest:</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.clientType === 'INTERNAL'} className="w-3.5 h-3.5 accent-primary" /> Internal</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.clientType === 'EXTERNAL'} className="w-3.5 h-3.5 accent-primary" /> External</label>
              </div>
              <span className="ml-8 text-xs font-medium">Others:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5"></span>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-28 text-xs font-medium">Phone Number:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderPhone}</span>
              <span className="w-16 text-xs text-center font-medium">E-mail:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderEmail}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-24 text-xs font-medium">Address:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderAddress}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-24 text-xs font-medium">City:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderCity}</span>
              <span className="w-12 text-xs text-center font-medium">State:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderState}</span>
              <span className="w-20 text-xs text-center font-medium">Zip Code:</span>
              <span className="w-32 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.holderZipCode}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-24 text-xs font-medium">Gender:</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.holderGender === 'MALE'} className="w-3.5 h-3.5 accent-primary" /> Male</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.holderGender === 'FEMALE'} className="w-3.5 h-3.5 accent-primary" /> Female</label>
              </div>
              <span className="ml-8 text-xs font-medium">Preferred Contact Method:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.preferredContactMethod}</span>
            </div>
          </div>
        </div>

        {/* Section 2: OTHER CONTACT */}
        <div className="mb-4">
          <div className="bg-primary text-white text-center font-bold py-1 mb-2 tracking-widest text-xs uppercase">
            Other Contact
          </div>
          <div className="p-3 space-y-3">
            <div className="flex items-end gap-2">
              <span className="w-24 text-xs font-medium">Name:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.emergencyContactName}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="w-28 text-xs font-medium">Phone Number:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.emergencyContactPhone}</span>
              <span className="w-24 text-xs text-center font-medium">Relationship:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{reservation.emergencyContactRelation}</span>
            </div>
          </div>
        </div>

        {/* Section 3: SERVICE AVAILED */}
        <div className="mb-4">
          <div className="bg-primary text-white text-center font-bold py-1 mb-2 tracking-widest text-xs uppercase">
            Service Availed
          </div>
          <div className="p-3 space-y-5">
            <div className="flex items-center gap-12">
              <span className="text-xs font-medium">Type of Service Availed:</span>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.facilities.some(f => !f.facility.facilityType.name.toUpperCase().includes('FUNCTION'))} className="w-3.5 h-3.5 accent-primary" /> Accommodation</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.facilities.some(f => f.facility.facilityType.name.toUpperCase().includes('FUNCTION'))} className="w-3.5 h-3.5 accent-primary" /> Function Hall</label>
            </div>
            <div className="space-y-3">
              <span className="text-xs font-medium">Room Type:</span>
              <div className="grid grid-cols-4 gap-4 pl-4">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.facilities.some(f => f.facility.facilityType.name.toLowerCase().includes('vip'))} className="w-3.5 h-3.5 accent-primary" /> VIP</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.facilities.some(f => f.facility.facilityType.name.toLowerCase().includes('tri'))} className="w-3.5 h-3.5 accent-primary" /> Tri-Bedroom</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.facilities.some(f => f.facility.facilityType.name.toLowerCase().includes('dorm'))} className="w-3.5 h-3.5 accent-primary" /> Dorm- Type Room</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.facilities.some(f => f.facility.facilityType.name.toLowerCase().includes('family'))} className="w-3.5 h-3.5 accent-primary" /> Family Room</label>
              </div>
            </div>
            <div className="flex items-end gap-6 pt-2">
              <span className="text-xs font-medium">Function Hall preferred time:</span>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.functionHallPreferredTime === '8am-12nn'} className="w-3.5 h-3.5 accent-primary" /> 8:00 am- 12:nn</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.functionHallPreferredTime === '1pm-5pm'} className="w-3.5 h-3.5 accent-primary" /> 1:00 pm- 5:00 pm</label>
              <span className="ml-4 text-xs font-medium">Other:</span>
              <span className="flex-1 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{!['8am-12nn', '1pm-5pm'].includes(reservation.functionHallPreferredTime || '') ? reservation.functionHallPreferredTime : ''}</span>
            </div>
          </div>
        </div>

        {/* Section 4: BACKGROUND INFORMATION */}
        <div className="mb-6">
          <div className="bg-primary text-white text-center font-bold py-1 mb-2 tracking-widest text-xs uppercase">
            Background Information
          </div>
          <div className="bg-gray-200/40 p-3 space-y-5">
            <div className="flex items-center gap-12">
              <span className="w-64 text-xs font-medium">Have you availed our service before?</span>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.hasAvailedBefore === true} className="w-3.5 h-3.5 accent-primary" /> Yes</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.hasAvailedBefore === false} className="w-3.5 h-3.5 accent-primary" /> No</label>
            </div>
            <div className="flex items-end gap-6">
              <span className="w-56 text-xs font-medium">How did you hear about us?</span>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.referralSource === 'Referral'} className="w-3.5 h-3.5 accent-primary" /> Referral</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.referralSource === 'Website'} className="w-3.5 h-3.5 accent-primary" /> Website</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" readOnly checked={reservation.referralSource === 'Social Media'} className="w-3.5 h-3.5 accent-primary" /> Social Media</label>
              <span className="flex items-end gap-2 text-xs font-medium">
                <input type="checkbox" readOnly checked={!!reservation.referralSource && !['Referral', 'Website', 'Social Media'].includes(reservation.referralSource)} className="w-3.5 h-3.5 accent-primary mb-1" /> Other:
                <span className="w-24 border-b border-gray-400 pb-0.5 font-bold text-gray-800">{!['Referral', 'Website', 'Social Media'].includes(reservation.referralSource || '') ? reservation.referralSource : ''}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: CONSENT & AGREEMENT */}
        <div className="mb-6">
          <div className="bg-primary text-white text-center font-bold py-1 mb-4 tracking-widest text-xs uppercase">
            Consent & Agreement
          </div>
          <div className="p-3">
            <p className="text-xs mb-10 text-gray-800">I hereby confirm that the information supplied is both true and accurate.</p>
            <div className="flex items-end gap-4 w-[60%]">
              <span className="text-xs font-medium">Client Signature:</span>
              <span className="flex-1 border-b border-gray-800 pb-0.5"></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex bg-primary text-white p-2 text-[9px] items-stretch min-h-[60px] -mx-8 mb-0 print:mx-0 print:mb-8 rounded-b-md print:rounded-none">
          <div className="flex-[0.9] text-center px-4 border-r border-white/30 flex flex-col justify-center">
            <h4 className="font-bold mb-1.5 uppercase">Vision</h4>
            <p className="leading-relaxed opacity-90">An institution leading in agri-fisheries and socio-cultural development in the ASEAN region</p>
          </div>
          <div className="flex-[1.2] text-center px-4 border-r border-white/30 flex flex-col justify-center">
            <h4 className="font-bold mb-1.5 uppercase">Mission</h4>
            <p className="leading-relaxed opacity-90">DNSC shall produce future-ready workforce, create innovative solutions and technologies, empower communities, and uphold good governance towards sustainable development</p>
          </div>
          <div className="flex-1 text-center px-4 border-r border-white/30 flex flex-col justify-center">
            <h4 className="font-bold mb-1.5 uppercase">Core Values</h4>
            <p className="leading-relaxed opacity-90">Stewardship<br />Adaptability and Excellence<br />Integrity and Innovativeness<br />Love of God and Country</p>
          </div>
          <div className="flex-[0.7] flex items-center justify-center gap-3 px-4 bg-white/5">
            <div className="w-11 h-11 rounded-full bg-[#f8f9fa] flex items-center justify-center text-blue-900 font-bold text-[6px] text-center border border-yellow-500 shadow-sm leading-tight p-1">Bagong<br />Pilipinas</div>
            <div className="w-11 h-11 rounded-full bg-[#1e3a8a] border border-yellow-500 flex items-center justify-center text-white font-bold text-[7px] shadow-sm tracking-wider">SEAL</div>
          </div>
        </div>
      </div>
    </>
  );
}
