'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth.context';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Search,
  Plus,
  Edit2,
  UserX,
  UserCheck,
  Key,
  X,
  Loader2,
  Shield,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'HOSTEL_MANAGER' | 'FRONT_DESK';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function StaffManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not manager (failsafe)
  useEffect(() => {
    if (user && user.role !== 'HOSTEL_MANAGER') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'FRONT_DESK' as 'HOSTEL_MANAGER' | 'FRONT_DESK',
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'FRONT_DESK' as 'HOSTEL_MANAGER' | 'FRONT_DESK',
  });
  const [resetForm, setResetForm] = useState({
    newPassword: '',
  });

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 10,
      };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter === 'active';

      const response = await apiClient.get('/users', { params });
      setUsers(response.data.data);
      setTotalPages(response.data.meta.totalPages);
      setTotalRecords(response.data.meta.total);
    } catch (error: any) {
      toast.error('Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // Toggle User Active Status
  const toggleUserStatus = async (userRecord: UserRecord) => {
    const action = userRecord.isActive ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/users/${userRecord.id}/${action}`);
      toast.success(
        `User ${userRecord.firstName} has been ${
          userRecord.isActive ? 'disabled' : 'enabled'
        }`
      );
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
    }
  };

  // Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await apiClient.post('/users', createForm);
      toast.success('Staff account created successfully');
      setCreateModalOpen(false);
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'FRONT_DESK',
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit User Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await apiClient.patch(`/users/${selectedUser.id}`, editForm);
      toast.success('Staff account updated successfully');
      setEditModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  // Reset Password Submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await apiClient.patch(
        `/users/${selectedUser.id}/reset-password`,
        { newPassword: resetForm.newPassword }
      );
      toast.success(`Password reset successfully for ${selectedUser.firstName}`);
      setResetModalOpen(false);
      setResetForm({ newPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setEditForm({
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      email: userRecord.email,
      role: userRecord.role,
    });
    setEditModalOpen(true);
  };

  const openResetModal = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setResetForm({ newPassword: '' });
    setResetModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage system users, permissions, roles and passwords.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow transition duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="HOSTEL_MANAGER">Hostel Manager</option>
              <option value="FRONT_DESK">Front Desk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg text-sm hover:bg-secondary/80 transition"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Main Staff Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <UserIcon className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-base font-semibold">No staff found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Login</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-foreground">
                          {item.firstName} {item.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {item.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.role === 'HOSTEL_MANAGER'
                            ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                            : 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {item.role === 'HOSTEL_MANAGER' ? 'Manager' : 'Front Desk'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        {item.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {item.lastLoginAt
                        ? new Date(item.lastLoginAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Never'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(item)}
                          disabled={user?.id === item.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                          title="Edit staff details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => openResetModal(item)}
                          disabled={user?.id === item.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                          title={user?.id === item.id ? 'Use the Profile page to change your own password' : 'Reset password'}
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Disable/Enable Button */}
                        <button
                          onClick={() => toggleUserStatus(item)}
                          disabled={user?.id === item.id}
                          className={`p-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${
                            item.isActive
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                          title={item.isActive ? 'Deactivate staff account' : 'Activate staff account'}
                        >
                          {item.isActive ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4 bg-muted/40">
            <span className="text-xs text-muted-foreground">
              Showing {users.length} of {totalRecords} staff records
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

      {/* ── CREATE USER MODAL ────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setCreateModalOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Add Staff Account</h2>
              <button
                disabled={formLoading}
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 chars, 1 uppercase, 1 special"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as 'HOSTEL_MANAGER' | 'FRONT_DESK',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FRONT_DESK">Front Desk Staff</option>
                  <option value="HOSTEL_MANAGER">Hostel Manager</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setCreateModalOpen(false)}
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
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT USER MODAL ──────────────────────────────────── */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setEditModalOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Edit Staff Account</h2>
              <button
                disabled={formLoading}
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as 'HOSTEL_MANAGER' | 'FRONT_DESK',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FRONT_DESK">Front Desk Staff</option>
                  <option value="HOSTEL_MANAGER">Hostel Manager</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setEditModalOpen(false)}
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

      {/* ── RESET PASSWORD MODAL ─────────────────────────────── */}
      {resetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !formLoading && setResetModalOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold">Reset Password</h2>
              <button
                disabled={formLoading}
                onClick={() => setResetModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 pt-4">
              <div className="text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 p-3 rounded-lg border border-rose-200 dark:border-rose-900/30">
                You are resetting the password for <span className="font-bold">{selectedUser.firstName} {selectedUser.lastName}</span> ({selectedUser.email}). The user will be logged out of all active sessions and will need this new password to sign back in.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">New Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 chars, 1 uppercase, 1 special"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ newPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
