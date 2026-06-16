'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '@/lib/api-client';

interface InventoryEntry {
  id: string;
  facilityId: string;
  itemId: string;
  quantity: number;
  condition: 'GOOD' | 'WORN' | 'DAMAGED' | 'MISSING';
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED';
  item: {
    id: string;
    name: string;
    category: { id: string; name: string };
  };
}

interface InventoryItem {
  id: string;
  name: string;
  category: { id: string; name: string };
}

interface Facility {
  id: string;
  facilityCode: string;
  building: string;
  facilityType: { name: string };
}

const CONDITION_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  GOOD: { label: 'Good', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  WORN: { label: 'Worn', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  DAMAGED: { label: 'Damaged', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  MISSING: { label: 'Missing', color: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700', icon: <X className="w-3.5 h-3.5" /> },
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  DISPOSED: { label: 'Disposed', color: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400' },
};

export default function FacilityInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = params?.facilityId as string;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<'GOOD' | 'WORN' | 'DAMAGED' | 'MISSING'>('GOOD');
  const [status, setStatus] = useState<'ACTIVE' | 'MAINTENANCE' | 'DISPOSED'>('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InventoryEntry | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, itemsRes, facRes] = await Promise.all([
        apiClient.get(`/inventory/facilities/${facilityId}`),
        apiClient.get('/inventory/items'),
        apiClient.get(`/facilities/${facilityId}`),
      ]);
      setInventory(Array.isArray(invRes.data) ? invRes.data : []);
      setAllItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setFacility(facRes.data);
    } catch {
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignedItemIds = new Set(inventory.map((i) => i.itemId));
  const availableItems = allItems.filter((i) => !assignedItemIds.has(i.id));

  const openAddModal = () => {
    setEditingEntry(null);
    setSelectedItemId(availableItems[0]?.id ?? '');
    setQty(1);
    setCondition('GOOD');
    setStatus('ACTIVE');
    setShowModal(true);
  };

  const openEditModal = (entry: InventoryEntry) => {
    setEditingEntry(entry);
    setSelectedItemId(entry.itemId);
    setQty(entry.quantity);
    setCondition(entry.condition);
    setStatus(entry.status);
    setShowModal(true);
  };

  const saveEntry = async () => {
    const itemId = editingEntry ? editingEntry.itemId : selectedItemId;
    if (!itemId || qty < 0) return;
    setSaving(true);
    try {
      await apiClient.post(`/inventory/facilities/${facilityId}`, { itemId, quantity: qty, condition, status });
      setShowModal(false);
      fetchData();
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (itemId: string) => {
    if (!confirm('Remove this item from this facility?')) return;
    try {
      await apiClient.delete(`/inventory/facilities/${facilityId}/items/${itemId}`);
      fetchData();
    } catch {
      setError('Failed to remove item');
    }
  };

  // Group inventory by category
  const grouped: Record<string, InventoryEntry[]> = {};
  for (const entry of inventory) {
    const cat = entry.item.category.name;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(entry);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {facility?.facilityCode ?? 'Facility'} Inventory
              </h1>
              <p className="text-muted-foreground text-sm">
                {facility?.building} · {facility?.facilityType?.name} · {inventory.length} item type{inventory.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            disabled={availableItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> Assign Item
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {['GOOD', 'WORN', 'DAMAGED', 'MISSING'].map((cond) => {
          const count = inventory.filter((i) => i.condition === cond).length;
          const s = CONDITION_STYLES[cond];
          return (
            <div key={cond} className={`p-3 rounded-xl border ${s.color} flex items-center gap-3`}>
              {s.icon}
              <div>
                <p className="text-xs opacity-70">{s.label}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory grouped by category */}
      {inventory.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No items assigned to this facility yet.</p>
          <p className="text-sm">Click &ldquo;Assign Item&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, entries]) => (
            <div key={category} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/50">
                <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              </div>
              <div className="divide-y divide-border">
                {entries.map((entry) => {
                  const cond = CONDITION_STYLES[entry.condition];
                  const stat = STATUS_STYLES[entry.status];
                  return (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{entry.item.name}</p>
                          <p className="text-muted-foreground text-xs">Quantity: {entry.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${cond.color}`}>
                          {cond.icon} {cond.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stat.color}`}>
                          {stat.label}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(entry)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                            title="Edit"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeEntry(entry.itemId)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editingEntry ? `Edit: ${editingEntry.item.name}` : 'Assign Item to Facility'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingEntry && (
                <div>
                  <label className="block text-sm text-foreground mb-1.5">Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-foreground mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as typeof condition)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="GOOD">Good</option>
                  <option value="WORN">Worn</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="MISSING">Missing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="DISPOSED">Disposed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEntry}
                disabled={saving || (!editingEntry && !selectedItemId)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
