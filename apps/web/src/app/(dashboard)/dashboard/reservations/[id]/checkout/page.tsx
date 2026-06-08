'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, Building2, Clock,
  ShieldCheck, AlertTriangle, FileText, Printer, Package,
  Plus, Trash2, LogOut, ClipboardCheck,
} from 'lucide-react';

interface ChecklistItem {
  itemId: string;
  itemName: string;
  categoryName: string;
  facilityId: string;
  facilityCode: string;
  quantityAssigned: number;
}

interface InventoryCheck {
  itemId: string;
  itemName: string;
  facilityId: string;
  facilityCode: string;
  quantityMissing: number;
  quantityDamaged: number;
  estimatedCost: number;
  remarks: string;
}

interface DamageItem { description: string; estimatedCost: number; location: string; }

function fmt(d: string) { return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }); }
function fmtD(d: string) { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }); }

export default function CheckOutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [form, setForm] = useState({ actualDepartureAt: new Date().toISOString().slice(0, 16), inventoryNotes: '', applyDamageCharges: true, remarks: '' });
  const [damages, setDamages] = useState<DamageItem[]>([]);
  const [newDamage, setNewDamage] = useState<DamageItem>({ description: '', estimatedCost: 0, location: '' });
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [inventoryChecks, setInventoryChecks] = useState<Record<string, InventoryCheck>>({});
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PPMP' | 'PURCHASE_ORDER'>('CASH');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    apiClient.get(`/checkin/checkout/reservations/${id}`)
      .then(r => {
        setDetails(r.data);
        // Initialize inventory checks from checklist
        const initial: Record<string, InventoryCheck> = {};
        (r.data.checklist || []).forEach((item: ChecklistItem) => {
          const key = `${item.facilityId}-${item.itemId}`;
          initial[key] = { itemId: item.itemId, itemName: item.itemName, facilityId: item.facilityId, facilityCode: item.facilityCode, quantityMissing: 0, quantityDamaged: 0, estimatedCost: 0, remarks: '' };
        });
        setInventoryChecks(initial);
      })
      .catch(() => { toast.error('Reservation not found'); router.push('/dashboard/reservations'); })
      .finally(() => setLoading(false));
  }, [id]);

  const updateCheck = (key: string, field: keyof InventoryCheck, value: number | string) => {
    setInventoryChecks(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const addDamage = () => {
    if (!newDamage.description.trim()) { toast.error('Description required'); return; }
    setDamages([...damages, { ...newDamage }]);
    setNewDamage({ description: '', estimatedCost: 0, location: '' });
    setShowDamageForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // First, process any outstanding balance if necessary
    const damageTotals = damages.reduce((s, d) => s + d.estimatedCost, 0);
    const invPenalties = Object.values(inventoryChecks).reduce((s, c) => s + c.estimatedCost, 0);
    const projBalance = details.billingSummary.remainingBalance + (form.applyDamageCharges ? damageTotals + invPenalties : 0);

    if (projBalance > 0) {
      try {
        await apiClient.post(`/reservations/${id}/payments`, {
          amount: projBalance,
          method: paymentMethod,
          referenceNumber: paymentRef || undefined,
          paidAt: new Date().toISOString(),
        });
        toast.success(`Payment of ₱${projBalance.toLocaleString()} recorded successfully.`);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to record payment. Check-out halted.');
        setSubmitting(false);
        return; // Halt check-out if payment fails
      }
    }

    const checksToSend = Object.values(inventoryChecks).filter(c => c.quantityMissing > 0 || c.quantityDamaged > 0 || c.estimatedCost > 0);
    try {
      await apiClient.post(`/checkin/checkout/reservations/${id}`, {
        actualDepartureAt: new Date(form.actualDepartureAt).toISOString(),
        inventoryNotes: form.inventoryNotes || undefined,
        damages: damages.length > 0 ? damages : undefined,
        inventoryChecks: checksToSend.length > 0 ? checksToSend : undefined,
        applyDamageCharges: form.applyDamageCharges,
        remarks: form.remarks || undefined,
      });
      toast.success('Check-out completed!');
      router.push(`/dashboard/reservations/${id}/checkout/slip`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Check-out failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!details) return null;

  const { reservation, checklist = [], billingSummary, canCheckOut, alreadyCheckedOut } = details;
  const nights = Math.max(1, Math.ceil((new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) / 86400000));
  const damageTotals = damages.reduce((s, d) => s + d.estimatedCost, 0);
  const invPenalties = Object.values(inventoryChecks).reduce((s, c) => s + c.estimatedCost, 0);
  const projectedBalance = billingSummary.remainingBalance + (form.applyDamageCharges ? damageTotals + invPenalties : 0);

  // Group checklist by facility
  const byFacility: Record<string, ChecklistItem[]> = {};
  checklist.forEach((item: ChecklistItem) => {
    if (!byFacility[item.facilityCode]) byFacility[item.facilityCode] = [];
    byFacility[item.facilityCode].push(item);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/dashboard/reservations/${id}`} className="hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> {reservation.reservationNumber}</Link>
        <span>/</span><span className="font-bold text-foreground">Check-Out</span>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg"><LogOut className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-extrabold">Guest Check-Out</h1>
            <p className="text-violet-100 text-sm">Verify inventory, record damages, and finalize departure</p>
          </div>
        </div>
      </div>

      {alreadyCheckedOut && (
        <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-violet-600 flex-shrink-0" />
          <div><p className="font-bold text-violet-800 dark:text-violet-300">Already Checked Out</p><p className="text-sm text-violet-600 dark:text-violet-400">This reservation has been processed for departure.</p></div>
          <Link href={`/dashboard/reservations/${id}/checkout/slip`} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-lg transition"><Printer className="w-3.5 h-3.5" /> Print Slip</Link>
        </div>
      )}

      {/* Reservation Summary */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Departure Verification</span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{reservation.reservationNumber}</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-xs font-bold text-muted-foreground uppercase mb-1">Guest</p>
              <p className="font-extrabold text-lg">{reservation.holderFirstName} {reservation.holderLastName}</p>
              <p className="text-sm text-muted-foreground">{reservation.holderEmail}</p></div>
            <div className="space-y-1 text-sm"><p className="text-xs font-bold text-muted-foreground uppercase mb-1">Stay Summary</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-In:</span><span className="font-bold">{fmtD(reservation.checkInDate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-Out:</span><span className="font-bold">{fmtD(reservation.checkOutDate)}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Duration:</span><span className="font-extrabold text-primary">{nights} night{nights !== 1 ? 's' : ''}</span></div>
              {reservation.checkInRecord && <div className="flex justify-between"><span className="text-muted-foreground">Arrived:</span><span className="font-bold">{fmt(reservation.checkInRecord.actualArrivalAt)}</span></div>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Facilities to Release</p>
            <div className="flex flex-wrap gap-2">
              {reservation.facilities.map((rf: any, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-sm">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold">{rf.facility.facilityCode}</span>
                  <span className="text-muted-foreground text-xs">{rf.facility.facilityType.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
              <p className="text-xs text-blue-600 font-semibold">Total Charges</p>
              <p className="font-black text-blue-800 dark:text-blue-300">₱{billingSummary.totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <p className="text-xs text-emerald-600 font-semibold">Paid</p>
              <p className="font-black text-emerald-800 dark:text-emerald-300">₱{billingSummary.totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`p-3 rounded-lg border ${billingSummary.remainingBalance > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900'}`}>
              <p className={`text-xs font-semibold ${billingSummary.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Balance</p>
              <p className={`font-black ${billingSummary.remainingBalance > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>₱{billingSummary.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {canCheckOut && !alreadyCheckedOut && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Departure Time */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
              <Clock className="w-4 h-4 text-primary" /><span className="text-sm font-bold">Departure Details</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Actual Departure Date & Time *</label>
                <input type="datetime-local" required value={form.actualDepartureAt} onChange={e => setForm({ ...form, actualDepartureAt: e.target.value })}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">General Inventory Notes</label>
                <textarea rows={2} value={form.inventoryNotes} onChange={e => setForm({ ...form, inventoryNotes: e.target.value })}
                  placeholder="Key cards returned, AC remotes checked…"
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              </div>
            </div>
          </div>

          {/* Inventory Checklist */}
          {checklist.length > 0 && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold">Inventory Checklist</span>
                <span className="ml-auto text-xs text-muted-foreground">{checklist.length} items to verify</span>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(byFacility).map(([facilityCode, items]) => (
                  <div key={facilityCode}>
                    <div className="px-5 py-2 bg-muted/30 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground uppercase">{facilityCode}</span>
                    </div>
                    {(items as ChecklistItem[]).map((item) => {
                      const key = `${item.facilityId}-${item.itemId}`;
                      const check = inventoryChecks[key] || { quantityMissing: 0, quantityDamaged: 0, estimatedCost: 0, remarks: '' };
                      const hasProblem = check.quantityMissing > 0 || check.quantityDamaged > 0;
                      return (
                        <div key={key} className={`px-5 py-3 ${hasProblem ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-semibold text-sm">{item.itemName}</span>
                              <span className="ml-2 text-xs text-muted-foreground">Assigned: {item.quantityAssigned} · {item.categoryName}</span>
                            </div>
                            {hasProblem && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Missing</label>
                              <input type="number" min={0} max={item.quantityAssigned} value={check.quantityMissing}
                                onChange={e => updateCheck(key, 'quantityMissing', Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-border bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Damaged</label>
                              <input type="number" min={0} max={item.quantityAssigned} value={check.quantityDamaged}
                                onChange={e => updateCheck(key, 'quantityDamaged', Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-border bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Est. Cost (₱)</label>
                              <input type="number" min={0} step="0.01" value={check.estimatedCost || ''}
                                onChange={e => updateCheck(key, 'estimatedCost', Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-border bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                            </div>
                          </div>
                          {hasProblem && (
                            <input type="text" placeholder="Remarks about this item…" value={check.remarks}
                              onChange={e => updateCheck(key, 'remarks', e.target.value)}
                              className="mt-2 w-full px-2 py-1.5 border border-border bg-background rounded text-xs focus:outline-none focus:ring-2 focus:ring-rose-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Damage Recording */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold">Additional Damage Notes</span>
              <span className="ml-auto text-xs text-muted-foreground">{damages.length} noted</span>
            </div>
            <div className="p-5 space-y-3">
              {damages.map((dmg, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-rose-900 dark:text-rose-200">{dmg.description}</p>
                    {dmg.location && <p className="text-xs text-rose-600">{dmg.location}</p>}
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mt-0.5">₱{dmg.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button type="button" onClick={() => setDamages(damages.filter((_, j) => j !== i))} className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {showDamageForm ? (
                <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg space-y-3">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">New Damage Item</p>
                  <input type="text" value={newDamage.description} onChange={e => setNewDamage({ ...newDamage, description: e.target.value })}
                    placeholder="Description *" className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={newDamage.location} onChange={e => setNewDamage({ ...newDamage, location: e.target.value })}
                      placeholder="Location" className="px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none" />
                    <input type="number" min={0} step="0.01" value={newDamage.estimatedCost || ''} onChange={e => setNewDamage({ ...newDamage, estimatedCost: Number(e.target.value) })}
                      placeholder="Est. Cost (₱)" className="px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowDamageForm(false)} className="px-3 py-1.5 border border-border text-sm rounded-lg hover:bg-accent">Cancel</button>
                    <button type="button" onClick={addDamage} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg">Add</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDamageForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-amber-400 text-amber-700 dark:text-amber-400 text-sm font-semibold rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition">
                  <Plus className="w-4 h-4" /> Add Manual Damage Note
                </button>
              )}
              <div className="flex items-center gap-3 pt-1">
                <input type="checkbox" id="applyCharges" checked={form.applyDamageCharges} onChange={e => setForm({ ...form, applyDamageCharges: e.target.checked })} className="w-4 h-4 accent-rose-600" />
                <label htmlFor="applyCharges" className="text-sm font-semibold cursor-pointer">Auto-post all damage & inventory charges to billing</label>
              </div>
            </div>
          </div>

          {/* Final Remarks & Submit */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
              <FileText className="w-4 h-4 text-primary" /><span className="text-sm font-bold">Final Remarks & Confirmation</span>
            </div>
            <div className="p-5 space-y-4">
              <textarea rows={2} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })}
                placeholder="Any final notes about the check-out…"
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
              {form.applyDamageCharges && (damageTotals + invPenalties > 0) && (
                <div className={`flex items-center justify-between p-3 rounded-lg border font-bold ${projectedBalance > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'}`}>
                  <span className="text-sm">Projected Balance After Check-Out:</span>
                  <span className="text-base">₱{projectedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {projectedBalance > 0 && (
                <div className="pt-4 border-t border-border mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-bold">Settle Outstanding Balance: ₱{projectedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1.5">Payment Method *</label>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="CASH">Cash</option>
                        <option value="PPMP">PPMP</option>
                        <option value="PURCHASE_ORDER">Purchase Order</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1.5">Reference Number (Optional)</label>
                      <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
                        placeholder="e.g. OR #12345"
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">Status will update to <strong>Checked Out</strong> upon confirmation.</p>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-lg shadow transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {projectedBalance > 0 ? 'Record Payment & Check-Out' : 'Confirm Check-Out'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!canCheckOut && !alreadyCheckedOut && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300">Cannot Perform Check-Out</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">Reservation must be <strong>Checked In</strong>. Current: <strong>{reservation.status}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
}
