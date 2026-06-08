'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Building2, Calendar,
  ChevronDown, Loader2, RefreshCw, FileText, Download,
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/auth.context';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── SVG Bar Chart ──────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = '#8b5cf6', format = 'number' }: {
  data: any[]; valueKey: string; labelKey: string; color?: string; format?: 'number' | 'currency';
}) {
  if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const fmt = (v: number) => format === 'currency' ? `₱${(v/1000).toFixed(1)}k` : String(v);
  return (
    <div className="flex items-end gap-1 h-48 w-full">
      {data.map((d, i) => {
        const h = Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 4 : 0);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {fmt(d[valueKey])}
            </div>
            <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, backgroundColor: color, opacity: 0.85 }} />
            <span className="text-xs text-slate-500 truncate w-full text-center">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Period Selector ────────────────────────────────────────────
function PeriodSelect({ period, setPeriod }: { period: string; setPeriod: (p: string) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg border border-border">
      {['daily','monthly','annual'].map(p => (
        <button key={p} onClick={() => setPeriod(p)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${period === p ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          {p}
        </button>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'occupancy'|'revenue'|'reservations'>('occupancy');
  const [period, setPeriod] = useState('monthly');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [clientType, setClientType] = useState<'INTERNAL'|'EXTERNAL'>('INTERNAL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    try { const r = await apiClient.get('/reports/summary'); setSummary(r.data); } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params: any = {};
      if (tab === 'occupancy') {
        if (period === 'daily') { endpoint = '/reports/occupancy/daily'; params.date = date; }
        else if (period === 'monthly') { endpoint = '/reports/occupancy/monthly'; params.year = year; params.month = month; }
        else { endpoint = '/reports/occupancy/annual'; params.year = year; }
      } else if (tab === 'revenue') {
        if (period === 'daily') { endpoint = '/reports/revenue/daily'; params.date = date; }
        else if (period === 'monthly') { endpoint = '/reports/revenue/monthly'; params.year = year; params.month = month; }
        else { endpoint = '/reports/revenue/annual'; params.year = year; }
      } else {
        endpoint = '/reports/reservations';
        params.clientType = clientType;
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;
      }
      const r = await apiClient.get(endpoint, { params });
      setData(r.data);
    } catch (e) { setData(null); }
    finally { setLoading(false); }
  }, [tab, period, date, year, month, clientType, fromDate, toDate]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const tabs = [
    { key: 'occupancy', label: 'Occupancy', icon: Building2 },
    { key: 'revenue', label: 'Revenue', icon: TrendingUp },
    { key: 'reservations', label: 'Reservations', icon: Users },
  ] as const;

  if (!user || user.role !== 'HOSTEL_MANAGER') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">You do not have the required permissions to view the reports and analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm">DNSC Hostel — Operational Overview</p>
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm text-sm font-medium transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Guests" value={String(summary.activeGuests)} sub="Currently checked in" icon={Users} color="#8b5cf6" />
          <StatCard label="Today's Check-ins" value={String(summary.todayCheckIns)} sub={new Date().toLocaleDateString('en-PH')} icon={Calendar} color="#10b981" />
          <StatCard label="Monthly Revenue" value={`₱${(summary.monthlyRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2})}`} sub="This month" icon={TrendingUp} color="#3b82f6" />
          <StatCard label="Total Facilities" value={String(summary.totalFacilities)} sub={`Internal: ${summary.clientBreakdown?.internal || 0} · External: ${summary.clientBreakdown?.external || 0}`} icon={Building2} color="#f59e0b" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {tab !== 'reservations' ? (
          <>
            <PeriodSelect period={period} setPeriod={setPeriod} />
            {period === 'daily' && (
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            )}
            {period === 'monthly' && (
              <div className="flex gap-2">
                <input type="number" value={year} min={2020} max={2099} onChange={e => setYear(Number(e.target.value))}
                  className="w-24 bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Year" />
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}
            {period === 'annual' && (
              <input type="number" value={year} min={2020} max={2099} onChange={e => setYear(Number(e.target.value))}
                className="w-24 bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1 p-1 bg-muted rounded-lg border border-border">
              {(['INTERNAL','EXTERNAL'] as const).map(ct => (
                <button key={ct} onClick={() => setClientType(ct)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${clientType === ct ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {ct === 'INTERNAL' ? '🏛️ Internal' : '🌐 External'}
                </button>
              ))}
            </div>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From"
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To"
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-muted-foreground">No data available for the selected period.</div>
      ) : (
        <>
          {/* OCCUPANCY */}
          {tab === 'occupancy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <p className="text-muted-foreground text-sm mb-1">Total Facilities</p>
                  <p className="text-3xl font-bold text-foreground">{data.totalFacilities}</p>
                </div>
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <p className="text-muted-foreground text-sm mb-1">{period === 'daily' ? 'Check-Ins' : period === 'monthly' ? 'Total Reservations' : 'Total Reservations'}</p>
                  <p className="text-3xl font-bold text-primary">{data.checkedIn ?? data.totalReservations}</p>
                </div>
                <div className="bg-card shadow-sm border border-primary/20 rounded-xl p-5">
                  <p className="text-muted-foreground text-sm mb-1">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-primary">{data.occupancyRate}%</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${data.occupancyRate}%` }} />
                  </div>
                </div>
              </div>

              {period === 'monthly' && data.daily && (
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-4">Daily Check-Ins — {MONTHS[month-1]} {year}</h3>
                  <BarChart data={data.daily} valueKey="count" labelKey="day" color="#10b981" />
                </div>
              )}
              {period === 'annual' && data.monthly && (
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-foreground font-semibold">Monthly Occupancy — {year}</h3>
                    {data.peakMonth && <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full font-semibold border border-primary/20">Peak: {data.peakMonth}</span>}
                  </div>
                  <BarChart data={data.monthly} valueKey="count" labelKey="label" color="#10b981" />
                </div>
              )}
              {period === 'daily' && data.byStatus && (
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-4">Reservations by Status — {date}</h3>
                  <div className="space-y-3">
                    {data.byStatus.map((s: any) => (
                      <div key={s.status} className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm w-32 font-medium">{s.status.replace('_',' ')}</span>
                        <div className="flex-1 bg-muted rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.max((s.count / Math.max(...data.byStatus.map((x:any)=>x.count),1)) * 100, s.count > 0 ? 4 : 0)}%` }} />
                        </div>
                        <span className="text-foreground font-bold text-sm w-6 text-right">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REVENUE */}
          {tab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Charges', value: `₱${(data.totalCharges||0).toLocaleString(undefined,{minimumFractionDigits:2})}`, color: '#3b82f6' },
                  { label: 'Total Collected', value: `₱${(data.totalPaid||0).toLocaleString(undefined,{minimumFractionDigits:2})}`, color: '#10b981' },
                  { label: 'Outstanding Balance', value: `₱${(data.totalBalance||0).toLocaleString(undefined,{minimumFractionDigits:2})}`, color: data.totalBalance > 0 ? '#ef4444' : '#10b981' },
                  { label: 'Collection Rate', value: `${data.collectionRate||0}%`, color: '#8b5cf6' },
                ].map(stat => (
                  <div key={stat.label} className="bg-card shadow-sm border border-border rounded-xl p-5">
                    <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                    <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {data.paymentByMethod && Object.keys(data.paymentByMethod).length > 0 && (
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-4">Payment by Method</h3>
                  <div className="space-y-4">
                    {Object.entries(data.paymentByMethod).map(([method, amount]: any) => (
                      <div key={method} className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm w-40 font-medium">{method.replace('_',' ')}</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${Math.max((amount/Math.max(data.totalPaid,1))*100, amount>0?4:0)}%` }} />
                        </div>
                        <span className="text-foreground font-bold text-sm">₱{Number(amount).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {period === 'monthly' && data.daily && (
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <h3 className="text-foreground font-semibold mb-4">Daily Revenue — {MONTHS[month-1]} {year}</h3>
                  <BarChart data={data.daily} valueKey="payments" labelKey="day" color="#10b981" format="currency" />
                </div>
              )}
              {period === 'annual' && data.monthly && (
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-foreground font-semibold">Monthly Revenue — {year}</h3>
                    {data.peakMonth && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-semibold border border-emerald-200">Peak: {data.peakMonth}</span>}
                  </div>
                  <BarChart data={data.monthly} valueKey="payments" labelKey="label" color="#10b981" format="currency" />
                </div>
              )}
            </div>
          )}

          {/* RESERVATIONS */}
          {tab === 'reservations' && data.reservations && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <p className="text-muted-foreground text-sm">Total</p>
                  <p className="text-3xl font-bold text-foreground">{data.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">{clientType} Clients</p>
                </div>
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <p className="text-muted-foreground text-sm">Total Revenue</p>
                  <p className="text-xl font-bold text-blue-600">₱{(data.totalRevenue||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <p className="text-muted-foreground text-sm">Total Collected</p>
                  <p className="text-xl font-bold text-emerald-600">₱{(data.totalCollected||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                </div>
                <div className="bg-card shadow-sm border border-border rounded-xl p-5">
                  <p className="text-muted-foreground text-sm">Outstanding</p>
                  <p className="text-xl font-bold text-rose-600">₱{((data.totalRevenue||0)-(data.totalCollected||0)).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                </div>
              </div>

              <div className="bg-card shadow-sm border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <h3 className="text-foreground font-semibold">{clientType} Client Reservations</h3>
                  <span className="text-xs text-muted-foreground font-medium">{data.total} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Ref No.</th>
                        <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Guest</th>
                        <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Facilities</th>
                        <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Status</th>
                        <th className="px-5 py-3 text-right text-muted-foreground font-semibold">Charges</th>
                        <th className="px-5 py-3 text-right text-muted-foreground font-semibold">Balance</th>
                        <th className="px-5 py-3 text-center text-muted-foreground font-semibold">Docs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.reservations.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No reservations found.</td></tr>
                      ) : data.reservations.map((r: any) => (
                        <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-5 py-3 font-mono text-primary font-medium text-xs">{r.reservationNumber}</td>
                          <td className="px-5 py-3">
                            <p className="text-foreground font-semibold">{r.holderName}</p>
                            <p className="text-muted-foreground text-xs">{r.holderEmail}</p>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground font-medium">{r.facilities.join(', ')}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              r.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              r.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              r.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{r.status.replace('_',' ')}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-foreground font-semibold">₱{r.totalCharges.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                          <td className="px-5 py-3 text-right font-medium">
                            <span className={r.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              ₱{r.balance.toLocaleString(undefined,{minimumFractionDigits:2})}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a href={`/dashboard/reservations/${r.id}/documents/billing-statement`} target="_blank"
                                className="p-1.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all" title="Billing Statement">
                                <FileText className="w-4 h-4" />
                              </a>
                              <a href={`/dashboard/reservations/${r.id}/documents/reservation-form`} target="_blank"
                                className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all" title="Reservation Form">
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
