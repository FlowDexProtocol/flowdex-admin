'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/purchases', label: 'Purchases' },
  { href: '/buyers', label: 'Buyers' },
  { href: '/referrals', label: 'Referrals' },
  { href: '/claims', label: 'Claims' },
  { href: '/otc', label: 'OTC' },
  { href: '/overrides', label: 'Overrides' },
  { href: '/reconciliation', label: 'Reconciliation' },
  { href: '/supply', label: 'Supply' },
  { href: '/reports', label: 'Reports' },
  { href: '/geo', label: 'Geo' },
  { href: '/audit-log', label: 'Audit Log' },
  { href: '/settings', label: 'Settings' },
];

const CONTENT_NAV_ITEMS = [
  { href: '/cms/banners', label: 'Banners' },
  { href: '/cms/faqs', label: 'FAQs' },
  { href: '/cms/blog', label: 'Blog' },
  { href: '/cms/pages', label: 'Pages' },
  { href: '/cms/media', label: 'Media' },
  { href: '/cms/team', label: 'Team' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const renderItems = (items: typeof NAV_ITEMS) =>
    items.map((item) => {
      const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            active ? 'bg-primary-dim text-primary' : 'text-ink-dim hover:bg-white/5 hover:text-ink'
          }`}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <nav className="flex flex-col gap-0.5">
      {renderItems(NAV_ITEMS)}
      <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Content</div>
      {renderItems(CONTENT_NAV_ITEMS)}
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
        FlowDex <span className="text-primary">Admin</span>
      </span>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { username, logout } = useAdminAuth();
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
          <NavLinks />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-3 text-xs text-ink-faint">Signed in as {username}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red hover:bg-red-dim"
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
              <button onClick={onCloseMobile} className="text-ink-dim hover:text-ink" aria-label="Close menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={onCloseMobile} />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="truncate px-3 text-xs text-ink-faint">Signed in as {username}</p>
              <button
                onClick={handleLogout}
                className="mt-2 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red hover:bg-red-dim"
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
