'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth.context';
import apiClient from '@/lib/api-client';
import {
  Building2,
  Plus,
  Edit2,
  X,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Settings2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface FacilityType {
  id: string;
  name: string;
  baseCapacity: number;
  maxCapacity: number;
  defaultRate: number;
  _count?: {
    facilities: number;
  };
}

interface Facility {
  id: string;
  building: string;
  facilityCode: string;
  facilityTypeId: string;
  isActive: boolean;
  facilityType: FacilityType;
  createdAt: string;
}

export default function FacilitiesPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'HOSTEL_MANAGER';

  // Tabs
  const [activeTab, setActiveTab] = useState<'list' | 'types'>('list');

  // Loading States
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Data States
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<FacilityType[]>([]);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [createFacilityOpen, setCreateFacilityOpen] = useState(false);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [editFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedType, setSelectedType] = useState<FacilityType | null>(null);

  // Form States
  const [facilityForm, setFacilityForm] = useState({
    building: '',
    facilityCode: '',
    facilityTypeId: '',
    isActive: true,
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    baseCapacity: 1,
    maxCapacity: 2,
    defaultRate: 0,
  });

  // Fetch Facilities
  const fetchFacilities = async () => {
    setFacilitiesLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 10,
      };
      if (search) params.search = search;
      if (typeFilter) params.facilityTypeId = typeFilter;
      if (statusFilter) params.isActive = statusFilter === 'active';

      const response = await apiClient.get('/facilities', { params });
      setFacilities(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error: any) {
      toast.error('Failed to load facilities');
    } finally {
      setFacilitiesLoading(false);
    }
  };

  // Fetch Facility Types
  const fetchTypes = async () => {
    setTypesLoading(true);
    try {
      const response = await apiClient.get('/facilities/types');
      setFacilityTypes(response.data);
    } catch (error: any) {
      toast.error('Failed to load facility types');
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [currentPage, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFacilities();
  };

  // Toggle Facility Status
  const toggleFacilityStatus = async (facility: Facility) => {
    if (!isManager) return;
    const action = facility.isActive ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/facilities/${facility.id}/${action}`);
      toast.success(`Facility ${facility.facilityCode} ${facility.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchFacilities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Create Facility
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiClient.post('/facilities', facilityForm);
      toast.success('Facility added successfully');
      setCreateFacilityOpen(false);
      setFacilityForm({ building: '', facilityCode: '', facilityTypeId: '', isActive: true });
      fetchFacilities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add facility');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Facility
  const handleEditFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    setFormLoading(true);
    try {
      await apiClient.patch(`/facilities/${selectedFacility.id}`, {
        building: facilityForm.building,
        facilityCode: facilityForm.facilityCode,
        facilityTypeId: facilityForm.facilityTypeId,
        isActive: facilityForm.isActive,
      });
      toast.success('Facility updated successfully');
      setEditFacilityOpen(false);
      fetchFacilities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update facility');
    } finally {
      setFormLoading(false);
    }
  };

  // Create Facility Type
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiClient.post('/facilities/types', {
        name: typeForm.name,
        baseCapacity: Number(typeForm.baseCapacity),
        maxCapacity: Number(typeForm.maxCapacity),
        defaultRate: Number(typeForm.defaultRate),
      });
      toast.success('Room type created successfully');
      setCreateTypeOpen(false);
      setTypeForm({ name: '', baseCapacity: 1, maxCapacity: 2, defaultRate: 0 });
      fetchTypes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create room type');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Facility Type (Rate & Capacities)
  const handleEditTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setFormLoading(true);
    try {
      await apiClient.patch(`/facilities/types/${selectedType.id}`, {
        baseCapacity: Number(typeForm.baseCapacity),
        maxCapacity: Number(typeForm.maxCapacity),
        defaultRate: Number(typeForm.defaultRate),
      });
      toast.success('Facility type details updated successfully');
      setEditTypeOpen(false);
      fetchTypes();
      fetchFacilities(); // Recalculate default capacity/rates display
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update facility type');
    } finally {
      setFormLoading(false);
    }
  };

  const openCreateFacility = () => {
    if (facilityTypes.length === 0) {
      toast.error('Please configure at least one Facility Type first.');
      return;
    }
    setFacilityForm({
      building: '',
      facilityCode: '',
      facilityTypeId: facilityTypes[0].id,
      isActive: true,
    });
    setCreateFacilityOpen(true);
  };

  const openEditFacility = (facility: Facility) => {
    setSelectedFacility(facility);
    setFacilityForm({
      building: facility.building,
      facilityCode: facility.facilityCode,
      facilityTypeId: facility.facilityTypeId,
      isActive: facility.isActive,
    });
    setEditFacilityOpen(true);
  };

  const openEditType = (type: FacilityType) => {
    setSelectedType(type);
    setTypeForm({
      name: type.name,
      baseCapacity: type.baseCapacity,
      maxCapacity: type.maxCapacity,
      defaultRate: type.defaultRate,
    });
    setEditTypeOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facility Management</h1>
          <p className="text-muted-foreground">
            Configure rooms, dorms, halls, rates, and occupancy parameters.
          </p>
        </div>
        {isManager && activeTab === 'list' && (
          <button
            onClick={openCreateFacility}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        )}
        {isManager && activeTab === 'types' && (
          <button
            onClick={() => {
              setTypeForm({ name: '', baseCapacity: 1, maxCapacity: 2, defaultRate: 0 });
              setCreateTypeOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" />
            Add Room Type
          </button>
        )}
      </div>

      {/* Access banner for front desk */}
      {!isManager && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <Settings2 className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Read-only Access:</strong> You are currently logged in with a Front Desk staff role. Facility details are viewable, but capacity edits, rate edits, and new creation are restricted to Hostel Managers.
          </span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Facilities List
          </span>
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'types'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Facility Types & Rates
          </span>
        </button>
      </div>

      {/* ── TAB 1: FACILITIES LIST ───────────────────────────── */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search code, building, or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none"
                >
                  <option value="">All Types</option>
                  {facilityTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg text-sm hover:bg-secondary/80 transition"
                >
                  Filter
                </button>
              </div>
            </form>
          </div>

          {/* Table Container */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {facilitiesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading facilities...</p>
              </div>
            ) : facilities.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                <h3 className="text-base font-semibold">No facilities found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Adjust filters or add a new room/facility.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-muted text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="p-4">Facility Code</th>
                      <th className="p-4">Building</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Capacity (Base/Max)</th>
                      <th className="p-4">Daily Rate</th>
                      <th className="p-4">Status</th>
                      {isManager && <th className="p-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {facilities.map((item) => (
                      <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          {item.facilityCode}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {item.building}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-semibold text-foreground border border-border">
                            {item.facilityType.name}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {item.facilityType.baseCapacity} / {item.facilityType.maxCapacity} Guests
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-foreground">
                          ₱{item.facilityType.defaultRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span
                            onClick={() => isManager && toggleFacilityStatus(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${
                              isManager ? 'cursor-pointer hover:opacity-85' : ''
                            } ${
                              item.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {item.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {item.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        {isManager && (
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditFacility(item)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                                title="Edit facility details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {!facilitiesLoading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-4 bg-muted/40">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1 bg-card border border-border text-xs rounded-lg hover:bg-accent disabled:opacity-50 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1 bg-card border border-border text-xs rounded-lg hover:bg-accent disabled:opacity-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: FACILITY TYPES & RATES ────────────────────── */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {typesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading categories...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-muted text-muted-foreground border-b border-border font-medium">
                    <tr>
                      <th className="p-4">Category Name</th>
                      <th className="p-4">Base Capacity</th>
                      <th className="p-4">Max Capacity</th>
                      <th className="p-4">Default Rate</th>
                      <th className="p-4">Total Rooms Registered</th>
                      {isManager && <th className="p-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {facilityTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-accent/30 transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          {type.name}
                        </td>
                        <td className="p-4 text-foreground font-semibold">
                          {type.baseCapacity} Guests
                        </td>
                        <td className="p-4 text-foreground font-semibold">
                          {type.maxCapacity} Guests
                        </td>
                        <td className="p-4 font-bold text-primary">
                          ₱{type.defaultRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">
                          {type._count?.facilities || 0} Units
                        </td>
                        {isManager && (
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openEditType(type)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-accent transition"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Modify Rates/Capacity
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE FACILITY MODAL ────────────────────────────── */}
      {createFacilityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setCreateFacilityOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Add Facility Unit</h2>
              <button
                disabled={formLoading}
                onClick={() => setCreateFacilityOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Facility Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP-105, DORM-204"
                  value={facilityForm.facilityCode}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, facilityCode: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Building / Wing</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Building A, Annex Block"
                  value={facilityForm.building}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, building: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Facility Type Category</label>
                <select
                  value={facilityForm.facilityTypeId}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, facilityTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {facilityTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Default rate: ₱{t.defaultRate.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setCreateFacilityOpen(false)}
                  className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT FACILITY MODAL ──────────────────────────────── */}
      {editFacilityOpen && selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setEditFacilityOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Edit Facility Unit</h2>
              <button
                disabled={formLoading}
                onClick={() => setEditFacilityOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditFacilitySubmit} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Facility Code</label>
                <input
                  type="text"
                  required
                  value={facilityForm.facilityCode}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, facilityCode: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Building / Wing</label>
                <input
                  type="text"
                  required
                  value={facilityForm.building}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, building: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Facility Type Category</label>
                <select
                  value={facilityForm.facilityTypeId}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, facilityTypeId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {facilityTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={facilityForm.isActive}
                  onChange={(e) =>
                    setFacilityForm({ ...facilityForm, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-primary focus:ring-2"
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-foreground select-none">
                  Facility Unit Active Status
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setEditFacilityOpen(false)}
                  className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE FACILITY TYPE MODAL ───────────────────────── */}
      {createTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setCreateTypeOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Add Room Type</h2>
              <button
                disabled={formLoading}
                onClick={() => setCreateTypeOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateType} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard, VIP, Function Hall"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Base Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={typeForm.baseCapacity}
                    onChange={(e) => setTypeForm({ ...typeForm, baseCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Max Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={typeForm.maxCapacity}
                    onChange={(e) => setTypeForm({ ...typeForm, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Default Daily Rate (₱)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={typeForm.defaultRate}
                  onChange={(e) => setTypeForm({ ...typeForm, defaultRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setCreateTypeOpen(false)}
                  className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Room Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT FACILITY TYPE MODAL ─────────────────────────── */}
      {editTypeOpen && selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setEditTypeOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Configure Facility Category</h2>
              <button
                disabled={formLoading}
                onClick={() => setEditTypeOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditTypeSubmit} className="space-y-4 pt-4">
              <div className="text-xs bg-muted p-2 rounded-lg text-muted-foreground border border-border mb-2">
                Modifying parameters for: <span className="font-semibold text-foreground">{selectedType.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Base Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={typeForm.baseCapacity}
                    onChange={(e) => setTypeForm({ ...typeForm, baseCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Max Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={typeForm.maxCapacity}
                    onChange={(e) => setTypeForm({ ...typeForm, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Default Daily Rate (₱)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={typeForm.defaultRate}
                  onChange={(e) => setTypeForm({ ...typeForm, defaultRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setEditTypeOpen(false)}
                  className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Rates & Capacity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
