'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useDebouncedValue, useFetch } from '@/lib/hooks';
import { exportPurchasesCsv, getAdminTiers, getPurchases } from '@/lib/api';
import { CHAIN_EXPLORERS } from '@/lib/types';
import { formatDateGmt4, formatTokens, formatUsd, truncateWallet } from '@/lib/format';
import {
  Badge,
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
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [tier, currency, status, from, to, search, limit]);

  const { data: tiers } = useFetch(() => adminFetch((t) => getAdminTiers(t)), []);
  const { data: result, loading, error } = useFetch(
    () =>
      adminFetch((t) =>
        getPurchases(t, {
          tier: tier || undefined,
          currency: currency || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to ? `${to}T23:59:59Z` : undefined,
          search: search || undefined,
          page,
          limit,
        })
      ),
    [tier, currency, status, from, to, search, page, limit]
  );

  const purchases = result?.data ?? null;
  const filtered = useMemo(() => {
    if (!purchases) return [];
    return chain ? purchases.filter((p) => p.chain === chain) : purchases;
  }, [purchases, chain]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportPurchasesCsv(token);
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
        <div className="mb-3">
          <Label>Search</Label>
          <div className="relative">
            <Input
              placeholder="Wallet, tx hash, or currency…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setPage(1);
              }}
              className="pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
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
        <>
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
