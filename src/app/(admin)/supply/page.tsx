'use client';

import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getSupply } from '@/lib/api';
import { formatPct, formatTokens } from '@/lib/format';
import { Card, ErrorNote, LoadingBlock, Mono, PageHeader, ProgressBar, StatCard } from '@/components/ui';

export default function SupplyPage() {
  const { adminFetch } = useAdminAuth();
  const { data: supply, loading, error } = useFetch(() => adminFetch((t) => getSupply(t)), [], 30000);

  return (
    <div>
      <PageHeader title="Token Supply" description="Full $FDP supply accounting across purchases, bonuses, and OTC." />

      {loading && !supply ? (
        <LoadingBlock />
      ) : error && !supply ? (
        <ErrorNote>{error}</ErrorNote>
      ) : supply ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Supply" value={formatTokens(supply.total_supply, 0)} />
            <StatCard label="Presale Max" value={formatTokens(supply.presale_max, 0)} tone="primary" />
            <StatCard label="Total Allocated" value={formatTokens(supply.total_allocated, 0)} tone="purple" />
            <StatCard label="Remaining to Allocate" value={formatTokens(supply.remaining_to_allocate, 0)} tone="green" />
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-ink-dim">Presale Allocation Utilization</p>
              <Mono className="text-sm font-bold text-primary">{formatPct(supply.utilization_pct, 4)}</Mono>
            </div>
            <ProgressBar
              pct={parseFloat(supply.utilization_pct)}
              tone={parseFloat(supply.utilization_pct) > 90 ? 'red' : 'primary'}
              className="mt-3"
            />
            <div className="mt-2 flex justify-between text-xs text-ink-faint">
              <span>0 $FDP</span>
              <span>{formatTokens(supply.presale_max, 0)} $FDP</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Allocated — Purchases</p>
              <Mono className="mt-1.5 block text-lg font-bold text-ink">{formatTokens(supply.allocated_purchases)}</Mono>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Allocated — Bonuses</p>
              <Mono className="mt-1.5 block text-lg font-bold text-ink">{formatTokens(supply.allocated_bonuses)}</Mono>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Allocated — OTC</p>
              <Mono className="mt-1.5 block text-lg font-bold text-ink">{formatTokens(supply.allocated_otc)}</Mono>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Total Burned</p>
              <Mono className="mt-1.5 block text-lg font-bold text-red">{formatTokens(supply.total_burned)}</Mono>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Net Outstanding</p>
              <Mono className="mt-1.5 block text-lg font-bold text-ink">{formatTokens(supply.net_outstanding)}</Mono>
              <p className="mt-1 text-xs text-ink-faint">Allocated minus burned</p>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
