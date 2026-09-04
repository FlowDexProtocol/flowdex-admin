'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';
import type { AdminRole } from '@/lib/types';

// roles: who can SEE this item. Matches the backend's actual access rules
// (super_admin-only: OTC/Overrides/Reconciliation/Supply/Reports/Users;
// editor+super_admin: everything else incl. Purchases/Buyers with backend-
// redacted fields; viewer: Dashboard + Settings only).
const NAV_ITEMS: { href: string; label: string; roles: AdminRole[] }[] = [
  { href: '/', label: 'Dashboard', roles: ['super_admin', 'editor', 'viewer'] },
  { href: '/purchases', label: 'Purchases', roles: ['super_admin', 'editor'] },
  { href: '/buyers', label: 'Buyers', roles: ['super_admin', 'editor'] },
  { href: '/referrals', label: 'Referrals', roles: ['super_admin', 'editor'] },
  { href: '/claims', label: 'Claims', roles: ['super_admin', 'editor'] },
  { href: '/otc', label: 'OTC', roles: ['super_admin'] },
  { href: '/overrides', label: 'Overrides', roles: ['super_admin'] },
  { href: '/reconciliation', label: 'Reconciliation', roles: ['super_admin'] },
  { href: '/supply', label: 'Supply', roles: ['super_admin'] },
  { href: '/reports', label: 'Reports', roles: ['super_admin'] },
  { href: '/geo', label: 'Geo', roles: ['super_admin', 'editor'] },
  { href: '/audit-log', label: 'Audit Log', roles: ['super_admin', 'editor'] },
  { href: '/users', label: 'Users', roles: ['super_admin'] },
  { href: '/settings', label: 'Settings', roles: ['super_admin', 'editor', 'viewer'] },
];

const CONTENT_NAV_ITEMS: { href: string; label: string; roles: AdminRole[] }[] = [
  { href: '/cms/banners', label: 'Banners', roles: ['super_admin', 'editor'] },
  { href: '/cms/faqs', label: 'FAQs', roles: ['super_admin', 'editor'] },
  { href: '/cms/blog', label: 'Blog', roles: ['super_admin', 'editor'] },
  { href: '/cms/pages', label: 'Pages', roles: ['super_admin', 'editor'] },
  { href: '/cms/media', label: 'Media', roles: ['super_admin', 'editor'] },
  { href: '/cms/team', label: 'Team', roles: ['super_admin', 'editor'] },
];

export function isPathAllowed(pathname: string, role: AdminRole | null): boolean {
  if (!role) return false;
  const allItems = [...NAV_ITEMS, ...CONTENT_NAV_ITEMS];
  const match = allItems.find((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)));
  // Unknown/dynamic routes (e.g. /cms/blog/[id], /cms/blog/new) fall back to
  // matching their nearest listed ancestor via startsWith above; if nothing
  // matches at all, default to allowing it rather than false-positive-
  // blocking a page nobody explicitly gated.
  if (!match) return true;
  return match.roles.includes(role);
}

function NavLinks({ onNavigate, role }: { onNavigate?: () => void; role: AdminRole | null }) {
  const pathname = usePathname();

  const renderItems = (items: typeof NAV_ITEMS) =>
    items
      .filter((item) => !role || item.roles.includes(role))
      .map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-primary-dim text-primary' : 'text-ink-dim hover:bg-white/5 hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      });

  const visibleContentItems = CONTENT_NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-0.5">
      {renderItems(NAV_ITEMS)}
      {visibleContentItems.length > 0 && (
        <>
          <div className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-widest text-ink-faint">Content</div>
          {renderItems(CONTENT_NAV_ITEMS)}
        </>
      )}
    </nav>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple font-bold text-[#03131a]">
        F
      </span>
      <span className="text-base font-bold tracking-tight">
        <span className="text-ink">Flow</span>
        <span className="text-primary">Dex</span>
        <span className="text-ink"> Admin</span>
      </span>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { username, role, logout } = useAdminAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <>
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-bg-soft lg:p-4">
        <div className="mb-6">
          <BrandMark />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks role={role} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-3 text-xs text-ink-faint">Signed in as {username}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-red hover:bg-red-dim"
          >
            Logout
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col border-r border-border bg-bg-soft p-4">
            <div className="mb-6 flex items-center justify-between">
              <BrandMark />
              <button
                onClick={onCloseMobile}
                className="flex h-11 w-11 items-center justify-center text-ink-dim hover:text-ink"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={onCloseMobile} role={role} />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="truncate px-3 text-xs text-ink-faint">Signed in as {username}</p>
              <button
                onClick={handleLogout}
                className="mt-2 flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-red hover:bg-red-dim"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
