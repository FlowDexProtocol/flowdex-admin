'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';
import Sidebar, { isPathAllowed } from './Sidebar';
import NotificationBell from './NotificationBell';
import { Spinner } from './ui';

export default function AdminShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // A viewer/editor navigating straight to a restricted URL (not just
  // clicking a hidden sidebar link) gets bounced to the dashboard.
  useEffect(() => {
    if (isAuthenticated && role && !isPathAllowed(pathname, role)) {
      router.replace('/');
    }
  }, [isAuthenticated, role, pathname, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-bg-soft px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-ink-dim lg:hidden"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-bold lg:hidden">
            <span className="text-ink">Flow</span>
            <span className="text-primary">Dex</span>
            <span className="text-ink"> Admin</span>
          </span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
