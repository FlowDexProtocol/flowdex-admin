'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useDebouncedValue, useFetch } from '@/lib/hooks';
import { exportAuditLogCsv, getAuditLog } from '@/lib/api';
import { formatDateGmt4, truncateWallet } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Label,
  LoadingBlock,
  Mono,
  PageHeader,
  Pagination,
  Select,
  TableShell,
  td,
  th,
} from '@/components/ui';

// Every event_type string that logAudit(...) is actually called with across
// flowdex-backend — kept here as a dropdown rather than free text.
const EVENT_TYPES = [
  'admin_login',
  'admin_password_changed',
  'admin_backup_codes_generated',
  'admin_override',
  'cms_banner_created',
  'cms_banner_updated',
  'cms_banner_deleted',
  'cms_banner_reordered',
  'cms_faq_created',
  'cms_faq_updated',
  'cms_faq_deleted',
  'cms_faq_reordered',
  'cms_blog_created',
  'cms_blog_updated',
  'cms_blog_deleted',
  'cms_blog_published',
  'cms_blog_unpublished',
  'cms_page_updated',
  'cms_page_bulk_updated',
  'cms_media_created',
  'cms_media_deleted',
  'cms_team_created',
  'cms_team_updated',
  'cms_team_deleted',
  'cms_team_reordered',
  'purchase_intent',
  'purchase_created',
  'purchase_confirmed',
  'purchase_flagged',
  'purchase_failed',
  'price_lock_expired',
  'payment_recovered',
  'tier_advanced',
  'tier_closed',
  'wallet_connected',
  'otc_allocation',
  'otc_paused',
  'otc_resumed',
  'withdrawal_recorded',
  'referral_applied',
  'referral_earned',
  'referral_fraud_detected',
  'claim_processed',
];

function JsonPreview({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-ink-faint">—</span>;
  const text = JSON.stringify(value);
  if (text.length <= 40) return <Mono className="text-xs text-ink-dim">{text}</Mono>;
  return (
    <details>
      <summary className="cursor-pointer text-xs text-primary">view</summary>
      <pre className="mt-1 max-w-xs whitespace-pre-wrap break-all rounded bg-bg-soft p-2 text-xs text-ink-dim">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default function AuditLogPage() {
  const { adminFetch, token } = useAdminAuth();
  const [eventType, setEventType] = useState('');
  const [walletInput, setWalletInput] = useState('');
  const wallet = useDebouncedValue(walletInput, 500);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [eventType, wallet, from, to, limit]);

  const { data: result, loading, error } = useFetch(
    () =>
      adminFetch((t) =>
        getAuditLog(t, {
          event_type: eventType || undefined,
          wallet: wallet || undefined,
          from: from || undefined,
          to: to ? `${to}T23:59:59Z` : undefined,
          page,
          limit,
        })
      ),
    [eventType, wallet, from, to, page, limit]
  );
  const entries = result?.data ?? null;

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportAuditLogCsv(token);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every recorded system and admin action."
        action={
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      {exportError && (
        <div className="mb-4">
          <ErrorNote>{exportError}</ErrorNote>
        </div>
      )}

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Event Type</Label>
            <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">All event types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Wallet</Label>
            <div className="relative">
              <Input value={walletInput} onChange={(e) => setWalletInput(e.target.value)} placeholder="0x…" className="pr-9" />
              {walletInput && (
                <button
                  type="button"
                  onClick={() => setWalletInput('')}
                  aria-label="Clear wallet filter"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:text-ink"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div>
            <Label>From</Label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <Label>To</Label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60"
            />
          </div>
        </div>
      </Card>

      {loading && !entries ? (
        <LoadingBlock />
      ) : error && !entries ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !entries || entries.length === 0 ? (
        <EmptyState>No audit log entries match these filters.</EmptyState>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>When</th>
                <th className={th}>Event</th>
                <th className={th}>Wallet</th>
                <th className={th}>Reason</th>
                <th className={th}>Old</th>
                <th className={th}>New</th>
                <th className={th}>By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} text-ink-dim`}>{formatDateGmt4(e.created_at)}</td>
                  <td className={td}>
                    <span className="rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-ink">{e.event_type}</span>
                  </td>
                  <td className={td}>
                    <Mono className="text-xs">{e.related_wallet ? truncateWallet(e.related_wallet) : '—'}</Mono>
                  </td>
                  <td className={`${td} max-w-[220px] text-xs text-ink-dim`}>{e.reason || '—'}</td>
                  <td className={td}>
                    <JsonPreview value={e.old_value} />
                  </td>
                  <td className={td}>
                    <JsonPreview value={e.new_value} />
                  </td>
                  <td className={`${td} text-ink-dim`}>{e.performed_by}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          {result && (
            <Pagination
              page={result.page}
              pages={result.pages}
              total={result.total}
              limit={result.limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}
    </div>
  );
}
