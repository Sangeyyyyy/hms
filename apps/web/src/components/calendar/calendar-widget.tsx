'use client';

import {
  Calendar,
  Users,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { EventApi, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '@/lib/api-client';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    reservationId: string;
    reservationNumber: string;
    status: string;
    holderName: string;
    facilityCode: string;
    facilityType: string;
  };
}

interface EventTooltip {
  event: EventApi;
  x: number;
  y: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', PENDING: 'Pending', CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In', CHECKED_OUT: 'Checked Out',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
};

export default function CalendarWidget() {
  const calendarRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<EventTooltip | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentRange, setCurrentRange] = useState<{ start: string; end: string } | null>(null);

  const fetchEvents = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/facilities/calendar', { params: { start, end } });
      setEvents(res.data);
    } catch {
      toast.error('Could not fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const s = arg.startStr.slice(0, 10);
    const e = arg.endStr.slice(0, 10);
    setCurrentRange({ start: s, end: e });
    fetchEvents(s, e);
  };

  const handleEventClick = (info: EventClickArg) => {
    const { reservationId } = info.event.extendedProps;
    window.location.href = `/dashboard/reservations/${reservationId}`;
  };

  const handleEventMouseEnter = (info: { event: EventApi; el: HTMLElement; jsEvent: MouseEvent }) => {
    setTooltip({ event: info.event, x: info.jsEvent.clientX, y: info.jsEvent.clientY });
  };

  const handleEventMouseLeave = () => setTooltip(null);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1 self-center">Legend:</span>
        {[
          { label: 'Draft',       color: '#94a3b8' },
          { label: 'Pending',     color: '#f59e0b' },
          { label: 'Confirmed',   color: '#3b82f6' },
          { label: 'Checked In',  color: '#10b981' },
          { label: 'Checked Out', color: '#8b5cf6' },
          { label: 'Completed',   color: '#14b8a6' },
        ].map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: `${s.color}15`,
              borderColor: `${s.color}40`,
              color: s.color,
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listMonth',
          }}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventMouseEnter={handleEventMouseEnter as any}
          eventMouseLeave={handleEventMouseLeave}
          eventDisplay="block"
          dayMaxEvents={3}
          height="700px"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false }}
          buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'List' }}
          eventDidMount={(info) => {
            info.el.style.cursor = 'pointer';
          }}
          dayCellClassNames="hover:bg-accent/30"
        />
      </div>

      {/* Event tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-xl shadow-2xl p-3.5 max-w-xs text-xs"
          style={{ left: tooltip.x + 14, top: tooltip.y - 80 }}
        >
          <div className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            {tooltip.event.extendedProps.facilityCode}
            <span className="text-muted-foreground font-normal">·</span>
            <span className="text-muted-foreground font-normal">{tooltip.event.extendedProps.facilityType}</span>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <div><span className="font-semibold text-foreground">HMS#:</span> {tooltip.event.extendedProps.reservationNumber}</div>
            <div><span className="font-semibold text-foreground">Guest:</span> {tooltip.event.extendedProps.holderName}</div>
            <div>
              <span className="font-semibold text-foreground">Status:</span>{' '}
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: tooltip.event.backgroundColor, color: '#fff' }}>
                {STATUS_LABELS[tooltip.event.extendedProps.status] ?? tooltip.event.extendedProps.status}
              </span>
            </div>
            <div><span className="font-semibold text-foreground">Check-in:</span> {new Date(tooltip.event.startStr).toLocaleDateString()}</div>
            <div><span className="font-semibold text-foreground">Check-out:</span> {new Date(tooltip.event.endStr ?? '').toLocaleDateString()}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
            Click to open reservation details
          </div>
        </div>
      )}
    </div>
  );
}
