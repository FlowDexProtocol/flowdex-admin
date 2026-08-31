'use client';

import { useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { downloadCsv, getAdminTiers, getPurchases } from '@/lib/api';
import { CHAIN_EXPLORERS } from '@/lib/types';
import { formatDateGmt4, formatTokens, formatUsd, truncateWallet } from '@/lib/format';
import { Badge, Button, Card, EmptyState, ErrorNote, Label, LoadingBlock, Mono, PageHeader, Select, TableShell, td, th } from '@/components/ui';

const CURRENCIES = ['ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'BTC', 'TRX'];
const CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'solana', 'bitcoin', 'tron'];
const STATUSES = ['intent', 'pending', 'confirmed', 'needs_pricing', 'failed', 'cancelled', 'refunded'];

const STATUS_TONE: Record<string, 'green' | 'red' | 'yellow' | 'primary' | 'neutral'> = {
  confirmed: 'green',
  pending: 'primary',
  intent: 'neutral',
  needs_pricing: 'yellow',
  failed: 'red',
  cancelled: 'red',
  refunded: 'yellow',
};

export default function PurchasesPage() {
  const { adminFetch, token } = useAdminAuth();

  const [tier, setTier] = useState('');
  const [currency, setCurrency] = useState('');
  const [chain, setChain] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: tiers } = useFetch(() => adminFetch((t) => getAdminTiers(t)), []);
  const { data: purchases, loading, error } = useFetch(
    () =>
      adminFetch((t) =>
        getPurchases(t, {
          tier: tier || undefined,
          currency: currency || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to ? `${to}T23:59:59Z` : undefined,
        })
      ),
    [tier, currency, status, from, to]
  );

  const filtered = useMemo(() => {
    if (!purchases) return [];
    return chain ? purchases.filter((p) => p.chain === chain) : purchases;
  }, [purchases, chain]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadCsv('/admin/report/financial/csv', token, `flowdex_purchases_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Purchase Log"
        description="All presale purchases. Chain filtering is applied client-side on the fetched page."
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
            <Label>Currency</Label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">All currencies</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Chain</Label>
            <Select value={chain} onChange={(e) => setChain(e.target.value)}>
              <option value="">All chains</option>
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {c}
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

      {loading && !purchases ? (
        <LoadingBlock />
      ) : error && !purchases ? (
        <ErrorNote>{error}</ErrorNote>
      ) : filtered.length === 0 ? (
        <EmptyState>No purchases match these filters.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Date (GMT+4)</th>
              <th className={th}>Wallet</th>
              <th className={th}>Chain</th>
              <th className={th}>Currency</th>
              <th className={th}>Crypto Amount</th>
              <th className={th}>USD Value</th>
              <th className={th}>Tier</th>
              <th className={th}>$FDP Allocated</th>
              <th className={th}>Status</th>
              <th className={th}>Tx Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => {
              const explorer = CHAIN_EXPLORERS[p.chain];
              return (
                <tr key={p.id} className={p.status === 'needs_pricing' ? 'bg-yellow-dim' : undefined}>
                  <td className={`${td} text-ink-dim`}>{formatDateGmt4(p.created_at)}</td>
                  <td className={td}>
                    <Mono>{truncateWallet(p.buyer_wallet)}</Mono>
                  </td>
                  <td className={`${td} text-ink-dim`}>{p.chain}</td>
                  <td className={`${td} text-ink-dim`}>{p.crypto_currency}</td>
                  <td className={td}>
                    <Mono>{formatTokens(p.crypto_amount, 6)}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatUsd(p.usd_value)}</Mono>
                  </td>
                  <td className={`${td} text-ink-dim`}>{p.tier_name || '—'}</td>
                  <td className={td}>
                    <Mono>{formatTokens(p.tokens_allocated)}</Mono>
                  </td>
                  <td className={td}>
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{p.status}</Badge>
                  </td>
                  <td className={td}>
                    {explorer ? (
                      <a href={explorer(p.tx_hash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">
                        {truncateWallet(p.tx_hash, 8, 6)}
                      </a>
                    ) : (
                      <Mono className="text-xs text-ink-faint">{truncateWallet(p.tx_hash, 8, 6)}</Mono>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
