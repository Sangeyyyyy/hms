'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth.context';
import apiClient from '@/lib/api-client';
import {
  User as UserIcon,
  Lock,
  Mail,
  Shield,
  Loader2,
  Calendar,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Profile fields state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    createdAt: '',
  });

  // Password fields state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch own profile details
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await apiClient.get('/users/me/profile');
      const data = response.data;
      setProfileData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        role: data.role || '',
        createdAt: data.createdAt || '',
      });
    } catch (error: any) {
      toast.error('Failed to load profile details');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Submit Profile Changes (First/Last name only)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtnLoading(true);
    try {
      await apiClient.patch('/users/me/profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
      });
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setBtnLoading(false);
    }
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPwdLoading(true);
    try {
      await apiClient.patch('/users/me/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          View account settings, permissions, and update your password.
        </p>
      </div>

      {profileLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card border border-border rounded-xl shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Overview Summary */}
          <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center text-center justify-between h-fit gap-4">
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-center w-20 h-20 bg-primary/10 text-primary rounded-full mx-auto text-3xl font-extrabold border border-primary/20 shadow-inner">
                {profileData.firstName?.[0]}
                {profileData.lastName?.[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25 mt-2 capitalize">
                  <Shield className="w-3.5 h-3.5" />
                  {profileData.role?.replace('_', ' ').toLowerCase()}
                </span>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-border space-y-3 text-left text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground/80" />
                <span className="truncate">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground/80" />
                <span>
                  Member since:{' '}
                  {profileData.createdAt
                    ? new Date(profileData.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Edit Info & Password Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Edit Info Form */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold flex items-center gap-2 pb-4 border-b border-border">
                <UserIcon className="w-4 h-4 text-primary" />
                Personal Information
              </h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                    <input
                      type="text"
                      required
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                    <input
                      type="text"
                      required
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={profileData.email}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground text-sm cursor-not-allowed"
                    title="Email address cannot be changed"
                  />
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    Contact a Hostel Manager to update your email.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                  >
                    {btnLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Update Profile
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold flex items-center gap-2 pb-4 border-b border-border">
                <Lock className="w-4 h-4 text-primary" />
                Change Password
              </h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow disabled:opacity-75 transition"
                  >
                    {pwdLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
