'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getAdminClaims, getAdminTiers, getClaimStats } from '@/lib/api';
import { formatDate, formatPct, formatTokens, truncateWallet } from '@/lib/format';
import { Badge, Card, EmptyState, ErrorNote, Label, LoadingBlock, Mono, PageHeader, ProgressBar, Select, TableShell, td, th } from '@/components/ui';

const STATUSES = ['eligible', 'claimed'];

const STATUS_TONE: Record<string, 'green' | 'primary' | 'neutral'> = {
  claimed: 'green',
  eligible: 'primary',
};

export default function ClaimsPage() {
  const { adminFetch } = useAdminAuth();
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');

  const { data: tiers } = useFetch(() => adminFetch((t) => getAdminTiers(t)), []);
  const { data: stats } = useFetch(() => adminFetch((t) => getClaimStats(t)), []);
  const { data: claims, loading, error } = useFetch(
    () => adminFetch((t) => getAdminClaims(t, { tier: tier || undefined, status: status || undefined })),
    [tier, status]
  );

  return (
    <div>
      <PageHeader title="Claims" description="TGE claim status across all buyers." />

      {stats && stats.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.tier_id}>
              <p className="text-xs uppercase tracking-widest text-ink-dim">{s.tier_name || `Tier ${s.tier_id}`}</p>
              <p className="mt-1.5 font-mono text-xl font-bold text-primary">{s.claim_rate_pct}%</p>
              <p className="mt-1 text-xs text-ink-dim">
                {s.claimed_count} / {s.total_claims} claimed
              </p>
              <ProgressBar pct={parseFloat(s.claim_rate_pct)} className="mt-3" />
            </Card>
          ))}
        </div>
      )}

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-3 sm:w-80">
          <div>
            <Label>Tier</Label>
            <Select value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="">All tiers</option>
              {tiers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {loading && !claims ? (
        <LoadingBlock />
      ) : error && !claims ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !claims || claims.length === 0 ? (
        <EmptyState>No claims match these filters.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Wallet</th>
              <th className={th}>Tier</th>
              <th className={th}>Purchased</th>
              <th className={th}>TGE %</th>
              <th className={th}>Claimable</th>
              <th className={th}>Status</th>
              <th className={th}>Claimed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {claims.map((c) => (
              <tr key={c.id}>
                <td className={td}>
                  <Mono>{truncateWallet(c.buyer_wallet)}</Mono>
                </td>
                <td className={`${td} text-ink-dim`}>{c.tier_name || `Tier ${c.tier_id}`}</td>
                <td className={td}>
                  <Mono>{formatTokens(c.total_purchased_tokens)}</Mono>
                </td>
                <td className={`${td} text-ink-dim`}>{formatPct(c.tge_percentage, 0)}</td>
                <td className={td}>
                  <Mono>{formatTokens(c.total_claimable)}</Mono>
                </td>
                <td className={td}>
                  <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</Badge>
                </td>
                <td className={`${td} text-ink-dim`}>{formatDate(c.claimed_at)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
