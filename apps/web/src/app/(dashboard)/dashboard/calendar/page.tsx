'use client';

import dynamic from 'next/dynamic';
import { CalendarDays, Loader2 } from 'lucide-react';

// FullCalendar must not be server-rendered (it uses DOM APIs)
const CalendarWidget = dynamic(
  () => import('@/components/calendar/calendar-widget'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading calendar…</p>
      </div>
    ),
  }
);

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          Reservations Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          Visual overview of all facility reservations. Click any event to open the reservation.
        </p>
      </div>
      <CalendarWidget />
    </div>
  );
}

