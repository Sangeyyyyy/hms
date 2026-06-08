'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Tag,
  Box,
  Loader2,
  X,
  Check,
  Building2,
} from 'lucide-react';
import apiClient from '@/lib/api-client';

interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
}

interface InventoryCategory {
  id: string;
  name: string;
  items: InventoryItem[];
}

interface Facility {
  id: string;
  facilityCode: string;
  building: string;
  facilityType: { name: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  Furniture: 'from-amber-50 to-amber-100 border-amber-200 text-amber-900',
  Bedding: 'from-sky-50 to-sky-100 border-sky-200 text-sky-900',
  Appliances: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900',
  Electronics: 'from-violet-50 to-violet-100 border-violet-200 text-violet-900',
};

const CATEGORY_ICONS: Record<string, string> = {
  Furniture: '🪑',
  Bedding: '🛏️',
  Appliances: '❄️',
  Electronics: '📺',
};

export default function InventoryPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'facilities'>('categories');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form values
  const [categoryName, setCategoryName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, facRes] = await Promise.all([
        apiClient.get('/inventory/categories'),
        apiClient.get('/facilities', { params: { limit: 100 } }),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setFacilities(facRes.data?.data || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Category CRUD
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: InventoryCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await apiClient.put(`/inventory/categories/${editingCategory.id}`, { name: categoryName });
      } else {
        await apiClient.post('/inventory/categories', { name: categoryName });
      }
      setShowCategoryModal(false);
      fetchData();
    } catch {
      setError('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category? This will fail if it has items.')) return;
    try {
      await apiClient.delete(`/inventory/categories/${id}`);
      fetchData();
    } catch {
      setError('Failed to delete category');
    }
  };

  // Item CRUD
  const openCreateItem = (categoryId = '') => {
    setEditingItem(null);
    setItemName('');
    setItemCategoryId(categoryId || (categories[0]?.id ?? ''));
    setPreselectedCategoryId(categoryId);
    setShowItemModal(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.categoryId);
    setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!itemName.trim() || !itemCategoryId) return;
    setSaving(true);
    try {
      if (editingItem) {
        await apiClient.put(`/inventory/items/${editingItem.id}`, { name: itemName, categoryId: itemCategoryId });
      } else {
        await apiClient.post('/inventory/items', { name: itemName, categoryId: itemCategoryId });
      }
      setShowItemModal(false);
      fetchData();
    } catch {
      setError('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await apiClient.delete(`/inventory/items/${id}`);
      fetchData();
    } catch {
      setError('Failed to delete item');
    }
  };

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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground text-sm">Manage asset categories, items, and facility assignments</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'categories'
              ? 'bg-primary border border-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <Tag className="w-4 h-4" /> Categories & Items
          </span>
        </button>
        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'facilities'
              ? 'bg-primary border border-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Facility Inventory
          </span>
        </button>
      </div>

      {/* Categories & Items Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <p className="text-muted-foreground text-sm">{categories.length} categories · {categories.reduce((s, c) => s + c.items.length, 0)} items total</p>
            <button
              onClick={openCreateCategory}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Category
            </button>
          </div>

          <div className="grid gap-5">
            {categories.map((cat) => {
              const colorClass = CATEGORY_COLORS[cat.name] || 'from-slate-50 to-slate-100 border-slate-200 text-slate-800';
              const icon = CATEGORY_ICONS[cat.name] || '📦';
              return (
                <div
                  key={cat.id}
                  className={`rounded-2xl border bg-gradient-to-br p-5 ${colorClass}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{cat.name}</h3>
                        <p className="opacity-80 text-sm">{cat.items.length} item{cat.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCreateItem(cat.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white border border-transparent hover:border-black/10 rounded-lg text-xs font-semibold text-current transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 rounded-lg text-current opacity-60 hover:opacity-100 hover:bg-white/50 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-current opacity-60 hover:text-red-600 hover:bg-white/50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {cat.items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-1 px-3 py-2 bg-white/60 border border-black/5 rounded-lg group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Box className="w-3.5 h-3.5 opacity-50 shrink-0" />
                            <span className="text-sm font-medium truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => openEditItem(item)}
                              className="p-0.5 text-current opacity-50 hover:opacity-100 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-0.5 text-current opacity-50 hover:text-red-600 hover:opacity-100 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic opacity-70">No items yet. Add one above.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Facility Inventory Tab */}
      {activeTab === 'facilities' && (
        <div>
          <p className="text-muted-foreground text-sm mb-5">{facilities.length} facilities — Click a facility to view and manage its inventory.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((facility) => (
              <Link
                key={facility.id}
                href={`/dashboard/inventory/${facility.id}`}
                className="group flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm hover:shadow"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-foreground">{facility.facilityCode}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{facility.building} · {facility.facilityType.name}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Category Name</label>
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCategory()}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="e.g., Furniture"
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                disabled={saving || !categoryName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-sm transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editingItem ? 'Edit Item' : 'New Item'}
              </h2>
              <button onClick={() => setShowItemModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Item Name</label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="e.g., Bed"
                autoFocus
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowItemModal(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving || !itemName.trim() || !itemCategoryId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-sm transition-all"
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
