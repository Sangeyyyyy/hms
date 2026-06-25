'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Upload,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Facility {
  id: string;
  facilityCode: string;
  building: string;
  facilityType: { name: string; defaultRate: number };
}

interface BookingRow {
  id: number;
  name: string;
  checkIn: string;
  checkOut: string;
  facilityCodes: string[];
  totalAmount: number | '';
}

interface ParsedRow {
  id: number;
  name: string;
  checkIn: string;
  checkOut: string;
  facilityCodes: string;
  totalAmount: number;
  valid: boolean;
  error?: string;
}

interface ImportResult {
  index: number;
  name: string;
  facilityCodes: string;
  success: boolean;
  reservationNumber?: string;
  error?: string;
}

function nightsCount(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition';
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1';

export default function BulkImportPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([
    { id: 1, name: '', checkIn: '', checkOut: '', facilityCodes: [], totalAmount: '' },
  ]);
  const [nextId, setNextId] = useState(2);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'results'>('input');
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [facilitySearch, setFacilitySearch] = useState('');

  useEffect(() => {
    apiClient
      .get('/facilities', { params: { isActive: true, limit: 100 } })
      .then((res) => {
        setFacilities(Array.isArray(res.data) ? res.data : res.data.data ?? []);
      })
      .catch(() => toast.error('Failed to load facilities'))
      .finally(() => setFacilitiesLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setDropdownOpen(null);
        setFacilitySearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: nextId, name: '', checkIn: '', checkOut: '', facilityCodes: [], totalAmount: '' },
    ]);
    setNextId((n) => n + 1);
  };

  const removeRow = (id: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateRow = (id: number, field: keyof BookingRow, value: any) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const toggleFacility = (rowId: number, code: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              facilityCodes: r.facilityCodes.includes(code)
                ? r.facilityCodes.filter((c) => c !== code)
                : [...r.facilityCodes, code],
            }
          : r
      )
    );
  };

  const filteredFacilities = facilities.filter(
    (f) =>
      f.facilityCode.toLowerCase().includes(facilitySearch.toLowerCase()) ||
      f.building.toLowerCase().includes(facilitySearch.toLowerCase()) ||
      f.facilityType.name.toLowerCase().includes(facilitySearch.toLowerCase())
  );

  const parseRows = () => {
    // First pass: basic field validation
    const parsedRows: ParsedRow[] = rows.map((r, idx) => {
      const name = r.name.trim();
      const checkIn = r.checkIn;
      const checkOut = r.checkOut;
      const facilityCodes = r.facilityCodes.join(', ');
      const amount = r.totalAmount === '' ? NaN : Number(r.totalAmount);

      const errors: string[] = [];
      if (!name) errors.push('Name required');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) errors.push('Invalid check-in date (use YYYY-MM-DD)');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) errors.push('Invalid check-out date (use YYYY-MM-DD)');
      if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) errors.push('Check-out must be after check-in');
      // facilityCodes is optional for bulk import (historical records may lack room detail)
      if (isNaN(amount) || amount < 0) errors.push('Invalid amount');

      return {
        id: idx,
        name,
        checkIn,
        checkOut,
        facilityCodes,
        totalAmount: isNaN(amount) ? 0 : amount,
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    });

    // Second pass: flag duplicates within the batch (same name + same check-in date)
    const seen = new Map<string, number>();
    const duplicateIndices = new Set<number>();
    parsedRows.forEach((r, idx) => {
      if (!r.name || !r.checkIn) return;
      const key = `${r.name.toLowerCase().trim()}|${r.checkIn}`;
      if (seen.has(key)) {
        duplicateIndices.add(seen.get(key)!);
        duplicateIndices.add(idx);
      } else {
        seen.set(key, idx);
      }
    });

    const finalRows = parsedRows.map((r, idx) =>
      duplicateIndices.has(idx)
        ? { ...r, valid: false, error: (r.error ? r.error + '; ' : '') + 'Duplicate: same name & check-in date in this batch' }
        : r
    );

    setParsed(finalRows);

    const invalidCount = finalRows.filter((r) => !r.valid).length;
    if (invalidCount > 0) {
      toast.warning(`${invalidCount} row(s) have errors`);
    }

    setStep('preview');
  };

  const handleSubmit = async () => {
    const validRows = parsed.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bookings: validRows.map((r) => ({
          name: r.name,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          facilityCodes: r.facilityCodes,
          totalAmount: r.totalAmount,
        })),
      };

      const res = await apiClient.post('/reservations/bulk-import', payload);
      setResults(res.data.results);
      setStep('results');

      const summary = res.data.summary;
      if (summary.failed === 0) {
        toast.success(`Successfully imported ${summary.success} booking(s)!`);
      } else {
        toast.warning(`Imported ${summary.success} booking(s), ${summary.failed} failed`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRows([{ id: 1, name: '', checkIn: '', checkOut: '', facilityCodes: [], totalAmount: '' }]);
    setNextId(2);
    setParsed([]);
    setResults(null);
    setStep('input');
  };

  const totalAmount = parsed.filter((r) => r.valid).reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/reservations" className="hover:text-foreground flex items-center gap-1 transition">
          <ChevronLeft className="w-4 h-4" /> Reservations
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Bulk Import</span>
      </div>

      {/* ── INPUT STEP ─────────────────────────────────────── */}
      {step === 'input' && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Import Past Bookings</h1>
            <p className="text-muted-foreground mt-1">
              Fill in each row below — one booking per row. Facilities are <span className="font-semibold text-foreground">optional</span> — enter the actual charged amount even if you don't recall the exact facility codes.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            {facilitiesLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading facilities...</span>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="hidden lg:grid lg:grid-cols-[2fr_1.2fr_1.2fr_1.8fr_1fr_40px] gap-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3">
                  <span>Guest Name</span>
                  <span>Check-in</span>
                  <span>Check-out</span>
                  <span>Facility Code(s) <span className="text-muted-foreground font-normal normal-case">(optional)</span></span>
                  <span className="text-right">Amount</span>
                  <span></span>
                </div>

                {/* Rows */}
                {rows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1.2fr_1.8fr_1fr_40px] gap-3 items-start p-3 rounded-lg border border-border bg-muted/30"
                  >
                    {/* Row label for mobile */}
                    <span className="lg:hidden text-[10px] font-semibold text-muted-foreground uppercase">
                      #{idx + 1} — Guest Name
                    </span>

                    {/* Name */}
                    <div>
                      <input
                        type="text"
                        placeholder="Juan Dela Cruz"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Check-in */}
                    <div>
                      <span className="lg:hidden text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">
                        Check-in
                      </span>
                      <input
                        type="date"
                        value={row.checkIn}
                        onChange={(e) => updateRow(row.id, 'checkIn', e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Check-out */}
                    <div>
                      <span className="lg:hidden text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">
                        Check-out
                      </span>
                      <input
                        type="date"
                        value={row.checkOut}
                        min={row.checkIn || undefined}
                        onChange={(e) => updateRow(row.id, 'checkOut', e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {/* Facility multi-select */}
                    <div className="relative" data-dropdown>
                      <span className="lg:hidden text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">
                        Facilities <span className="normal-case font-normal">(optional)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(dropdownOpen === row.id ? null : row.id);
                          setFacilitySearch('');
                        }}
                        className={`${inputCls} text-left flex items-center gap-1 flex-wrap min-h-[38px]`}
                      >
                        {row.facilityCodes.length === 0 ? (
                          <span className="text-muted-foreground">Select facilities...</span>
                        ) : (
                          row.facilityCodes.map((code) => (
                            <span
                              key={code}
                              className="inline-flex items-center gap-0.5 font-mono font-bold text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                            >
                              {code}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFacility(row.id, code);
                                }}
                                className="hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </span>
                            </span>
                          ))
                        )}
                      </button>

                      {dropdownOpen === row.id && (
                        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg p-2 max-h-64 flex flex-col">
                          <div className="relative mb-1.5">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search facilities..."
                              value={facilitySearch}
                              onChange={(e) => setFacilitySearch(e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="overflow-y-auto flex-1 space-y-0.5">
                            {filteredFacilities.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-3">No facilities found</p>
                            ) : (
                              filteredFacilities.map((fac) => {
                                const checked = row.facilityCodes.includes(fac.facilityCode);
                                return (
                                  <label
                                    key={fac.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                                      checked ? 'bg-primary/5 text-primary' : 'hover:bg-muted'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleFacility(row.id, fac.facilityCode)}
                                      className="accent-primary w-3.5 h-3.5"
                                    />
                                    <span className="font-mono font-bold">{fac.facilityCode}</span>
                                    <span className="text-muted-foreground">{fac.building}</span>
                                    <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted border border-border">
                                      {fac.facilityType.name}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <span className="lg:hidden text-[10px] font-semibold text-muted-foreground uppercase block mb-0.5">
                        Amount (₱)
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="10000"
                        value={row.totalAmount}
                        onChange={(e) => updateRow(row.id, 'totalAmount', e.target.value === '' ? '' : Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>

                    {/* Remove */}
                    <div className="flex items-start justify-end lg:justify-center pt-0 lg:pt-0">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        className="p-1.5 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add row button */}
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-border text-sm font-medium rounded-lg hover:bg-accent transition text-muted-foreground w-full justify-center"
                >
                  <Plus className="w-4 h-4" /> Add Another Booking
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/dashboard/reservations"
              className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Cancel
            </Link>
            <button
              type="button"
              disabled={rows.every((r) => !r.name && !r.checkIn && !r.checkOut && r.totalAmount === '')}
              onClick={parseRows}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Upload className="w-4 h-4" />
              Review & Import
            </button>
          </div>
        </>
      )}

      {/* ── PREVIEW STEP ──────────────────────────────────── */}
      {step === 'preview' && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Bookings</h1>
            <p className="text-muted-foreground mt-1">
              {parsed.length} booking(s) parsed · {parsed.filter((r) => r.valid).length} valid
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-left">
                <thead className="bg-muted text-muted-foreground border-b border-border font-medium text-xs uppercase tracking-wide">
                  <tr>
                    <th className="p-3 pl-4">#</th>
                    <th className="p-3">Guest Name</th>
                    <th className="p-3">Check-in</th>
                    <th className="p-3">Check-out</th>
                    <th className="p-3">Nights</th>
                    <th className="p-3">Facilities</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsed.map((row) => {
                    const nights = row.valid ? nightsCount(row.checkIn, row.checkOut) : 0;
                    const codes = row.facilityCodes.split(',').map((c) => c.trim()).filter(Boolean);
                    return (
                      <tr key={row.id} className={`${row.valid ? '' : 'bg-rose-50/50 dark:bg-rose-950/10'} hover:bg-accent/30 transition-colors`}>
                        <td className="p-3 pl-4 text-xs text-muted-foreground font-mono">{row.id + 1}</td>
                        <td className="p-3 font-medium">{row.name}</td>
                        <td className="p-3 text-sm">{row.checkIn || '—'}</td>
                        <td className="p-3 text-sm">{row.checkOut || '—'}</td>
                        <td className="p-3 font-semibold text-center">{row.valid ? `${nights}N` : '—'}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {codes.length > 0 ? codes.map((code) => (
                              <span key={code} className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                                {code}
                              </span>
                            )) : <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          ₱{row.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          {row.valid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-full" title={row.error}>
                              <XCircle className="w-3 h-3" /> {row.error}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setParsed((prev) => prev.filter((r) => r.id !== row.id));
                              if (parsed.length <= 1) setStep('input');
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/50 border-t border-border">
                  <tr>
                    <td colSpan={6} className="p-3 pl-4 text-sm font-bold">Total</td>
                    <td className="p-3 text-right font-extrabold text-primary">
                      ₱{totalAmount.toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
            >
              <ChevronLeft className="w-4 h-4" /> Edit List
            </button>
            <button
              type="button"
              disabled={submitting || parsed.filter((r) => r.valid).length === 0}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow disabled:opacity-75 transition"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {submitting ? 'Importing…' : `Import ${parsed.filter((r) => r.valid).length} Booking(s)`}
            </button>
          </div>
        </>
      )}

      {/* ── RESULTS STEP ──────────────────────────────────── */}
      {step === 'results' && results && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Import Complete</h1>
            <p className="text-muted-foreground mt-1">
              {results.filter((r) => r.success).length} succeeded · {results.filter((r) => !r.success).length} failed
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="text-xs text-muted-foreground font-semibold">Total</div>
              <div className="text-2xl font-extrabold text-foreground mt-1">{results.length}</div>
            </div>
            <div className="bg-card border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 shadow-sm bg-emerald-50/50 dark:bg-emerald-950/10">
              <div className="text-xs text-emerald-600 font-semibold">Imported</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{results.filter((r) => r.success).length}</div>
            </div>
            <div className="bg-card border border-rose-200 dark:border-rose-900 rounded-xl p-4 shadow-sm bg-rose-50/50 dark:bg-rose-950/10">
              <div className="text-xs text-rose-600 font-semibold">Failed</div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">{results.filter((r) => !r.success).length}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm text-left">
                <thead className="bg-muted text-muted-foreground border-b border-border font-medium text-xs uppercase tracking-wide">
                  <tr>
                    <th className="p-3 pl-4">Guest Name</th>
                    <th className="p-3">Facilities</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-accent/30 transition-colors">
                      <td className="p-3 pl-4 font-medium">{r.name}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {r.facilityCodes.split(',').map((c) => (
                            <span key={c.trim()} className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                              {c.trim()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {r.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {r.success ? (
                          <span className="font-mono text-primary font-semibold">{r.reservationNumber}</span>
                        ) : (
                          <span className="text-rose-600">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow transition"
            >
              <Upload className="w-4 h-4" /> Import More
            </button>
            <Link
              href="/dashboard/reservations"
              className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
            >
              View Reservations
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
