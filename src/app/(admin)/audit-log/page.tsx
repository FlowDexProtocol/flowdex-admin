'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getAuditLog } from '@/lib/api';
import { formatDateGmt4, truncateWallet } from '@/lib/format';
import { Card, EmptyState, ErrorNote, Input, Label, LoadingBlock, Mono, PageHeader, TableShell, td, th } from '@/components/ui';

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
  const { adminFetch } = useAdminAuth();
  const [eventType, setEventType] = useState('');
  const [wallet, setWallet] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: entries, loading, error } = useFetch(
    () =>
      adminFetch((t) =>
        getAuditLog(t, {
          event_type: eventType || undefined,
          wallet: wallet || undefined,
          from: from || undefined,
          to: to ? `${to}T23:59:59Z` : undefined,
        })
      ),
    [eventType, wallet, from, to]
  );

  return (
    <div>
      <PageHeader title="Audit Log" description="Every recorded system and admin action." />

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Event Type</Label>
            <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="admin_override…" />
          </div>
          <div>
            <Label>Wallet</Label>
            <Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" />
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
      )}
    </div>
  );
}
