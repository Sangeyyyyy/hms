'use client';

import { useState } from 'react';
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
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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

export default function BulkImportPage() {
  const router = useRouter();
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'results'>('input');

  const parseText = () => {
    const lines = raw.split('\n').filter((l) => l.trim());
    const rows: ParsedRow[] = lines.map((line, idx) => {
      const sep = line.includes('|') ? '|' : ',';
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length < 5) {
        return { id: idx, name: line, checkIn: '', checkOut: '', facilityCodes: '', totalAmount: 0, valid: false, error: 'Need 5 fields: Name | Check-in | Check-out | Facility Codes | Amount' };
      }

      const name = parts[0];
      const checkIn = parts[1];
      const checkOut = parts[2];
      const facilityCodes = parts[3].toUpperCase();
      const amount = parseFloat(parts[4].replace(/[₱,]/g, ''));

      const errors: string[] = [];
      if (!name) errors.push('Name required');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) errors.push('Invalid check-in date (use YYYY-MM-DD)');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) errors.push('Invalid check-out date (use YYYY-MM-DD)');
      if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) errors.push('Check-out must be after check-in');
      if (!facilityCodes) errors.push('Facility code(s) required');
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

    setParsed(rows);

    const invalidCount = rows.filter((r) => !r.valid).length;
    if (invalidCount > 0) {
      toast.warning(`${invalidCount} row(s) have errors`);
    }

    setStep('preview');
  };

  const removeRow = (id: number) => {
    setParsed((prev) => prev.filter((r) => r.id !== id));
    if (parsed.length <= 1) setStep('input');
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
    setRaw('');
    setParsed([]);
    setResults(null);
    setStep('input');
  };

  const totalAmount = parsed.filter((r) => r.valid).reduce((sum, r) => sum + r.totalAmount, 0);

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition';

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
              Paste your past bookings below — one per line in the format:
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              Format
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm font-mono text-muted-foreground leading-relaxed">
              Guest Name | Check-in | Check-out | Facility Code(s) | Amount<br />
              <span className="text-xs text-muted-foreground/70">
                Example: Juan Dela Cruz | 2026-01-15 | 2026-01-17 | V101 | 10000
              </span>
              <br />
              <span className="text-xs text-muted-foreground/70">
                For multiple facilities, separate codes with commas: D201, D202
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Paste bookings below
              </label>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={12}
                placeholder={`Juan Dela Cruz | 2026-01-15 | 2026-01-17 | V101 | 10000\nMaria Santos | 2026-02-01 | 2026-02-03 | D201, D202 | 7000\nPedro Reyes | 2026-03-10 | 2026-03-11 | FH1 | 15000`}
                className={`${inputCls} resize-y font-mono text-sm`}
              />
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
                disabled={!raw.trim()}
                onClick={parseText}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Upload className="w-4 h-4" />
                Parse & Preview
              </button>
            </div>
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
                            onClick={() => removeRow(row.id)}
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
