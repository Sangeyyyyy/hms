'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Calendar,
  CalendarDays,
  LayoutDashboard,
  Package,
  Search,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
  BarChart3,
  Bell,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth.context';

/* ─── Nav structure ──────────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        label: 'Calendar',
        href: '/dashboard/calendar',
        icon: <CalendarDays className="w-4 h-4" />,
      },
    ],
  },
  {
    section: 'Operations',
    items: [
      {
        label: 'Reservations',
        href: '/dashboard/reservations',
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: 'Availability',
        href: '/dashboard/availability',
        icon: <Search className="w-4 h-4" />,
      },
      {
        label: 'Facilities',
        href: '/dashboard/facilities',
        icon: <Building2 className="w-4 h-4" />,
      },
      {
        label: 'Inventory',
        href: '/dashboard/inventory',
        icon: <Package className="w-4 h-4" />,
      },
    ],
  },
  {
    section: 'Management',
    items: [
      {
        label: 'Reports',
        href: '/dashboard/reports',
        icon: <BarChart3 className="w-4 h-4" />,
        roles: ['HOSTEL_MANAGER'],
      },
      {
        label: 'Staff',
        href: '/dashboard/staff',
        icon: <Users className="w-4 h-4" />,
        roles: ['HOSTEL_MANAGER'],
      },
    ],
  },
];

/* ─── Page title map ────────────────────────────────────────── */
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/reservations': 'Reservations',
  '/dashboard/reservations/new': 'New Reservation',
  '/dashboard/availability': 'Availability',
  '/dashboard/facilities': 'Facilities',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/reports': 'Reports',
  '/dashboard/staff': 'Staff',
  '/dashboard/profile': 'My Profile',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes('/checkin/slip')) return 'Check-In Slip';
  if (pathname.includes('/checkout/slip')) return 'Check-Out Slip';
  if (pathname.includes('/checkin')) return 'Guest Check-In';
  if (pathname.includes('/checkout')) return 'Guest Check-Out';
  if (pathname.includes('/edit')) return 'Edit Reservation';
  if (pathname.includes('/documents/billing-statement')) return 'Billing Statement';
  if (pathname.includes('/documents/reservation-form')) return 'Reservation Form';
  if (pathname.match(/\/dashboard\/reservations\/[^/]+$/)) return 'Reservation Detail';
  if (pathname.match(/\/dashboard\/inventory\/[^/]+$/)) return 'Facility Inventory';
  return 'Dashboard';
}

/* ─── Avatar ────────────────────────────────────────────────── */
function Avatar({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' }}>
      {initials}
    </div>
  );
}

/* ─── Main Shell ─────────────────────────────────────────────── */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col',
          'transform transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: 'hsl(var(--sidebar-bg))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 bg-white overflow-hidden ring-2 ring-white/10">
            <Image
              src="/logos/hostel logo no text.png"
              alt="Hostel Logo"
              width={48}
              height={48}
              className="max-w-none object-contain translate-y-[4px]"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight text-white">DNSC HMS</p>
            <p className="text-xs" style={{ color: 'hsl(var(--sidebar-muted))' }}>Hostel Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || (user && item.roles.includes(user.role))
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section}>
                {/* Section label */}
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'hsl(var(--sidebar-muted))' }}>
                  {section.section}
                </p>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                          'transition-all duration-150 relative',
                        )}
                        style={
                          isActive
                            ? {
                                background: 'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)',
                                color: '#a7f3d0',
                              }
                            : { color: 'hsl(var(--sidebar-fg))' }
                        }
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'hsl(var(--sidebar-hover))';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = '';
                          }
                        }}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 inset-y-1 w-0.5 rounded-full"
                            style={{ background: '#10b981' }} />
                        )}
                        <span className={cn('flex-shrink-0', isActive ? 'text-emerald-400' : '')}
                          style={{ color: isActive ? '#34d399' : 'hsl(var(--sidebar-muted))' }}>
                          {item.icon}
                        </span>
                        {item.label}
                        {isActive && (
                          <ChevronRight className="ml-auto w-3.5 h-3.5 opacity-50" style={{ color: '#34d399' }} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-3 flex-shrink-0 space-y-1"
          style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-150"
              style={{ color: 'hsl(var(--sidebar-fg))' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--sidebar-hover))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <Avatar firstName={user?.firstName} lastName={user?.lastName} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs capitalize truncate" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                  {user?.role?.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200', userMenuOpen && 'rotate-180')}
                style={{ color: 'hsl(var(--sidebar-muted))' }} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ background: 'hsl(var(--sidebar-bg))', border: '1px solid hsl(var(--sidebar-border))' }}>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'hsl(var(--sidebar-fg))' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--sidebar-hover))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <UserCircle className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-muted))' }} />
                  My Profile
                </Link>
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{
                    color: '#f87171',
                    borderTop: '1px solid hsl(var(--sidebar-border))',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="flex items-center gap-4 h-14 px-4 flex-shrink-0"
          style={{
            borderBottom: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}>

          {/* Mobile menu toggle */}
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg transition-colors hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-base text-foreground truncate">{pageTitle}</h1>
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell placeholder */}
            <button
              className="relative p-2 rounded-lg transition-colors hover:bg-accent"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5 text-muted-foreground" style={{ width: '18px', height: '18px' }} />
            </button>

            {/* Role badge */}
            <span className="hidden sm:inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))',
                border: '1px solid hsl(var(--primary) / 0.2)',
              }}>
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
