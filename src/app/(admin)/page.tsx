'use client';

import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getDashboard, getPublicDailyStats, getSupply } from '@/lib/api';
import { formatDateGmt4, formatPct, formatTokens, formatUsd, toNum } from '@/lib/format';
import { Badge, Card, ErrorNote, LoadingBlock, PageHeader, ProgressBar, StatCard } from '@/components/ui';

export default function DashboardPage() {
  const { adminFetch } = useAdminAuth();

  const { data: dashboard, loading: dashboardLoading, error: dashboardError } = useFetch(
    () => adminFetch((token) => getDashboard(token)),
    [],
    30000
  );
  const { data: supply, loading: supplyLoading } = useFetch(() => adminFetch((token) => getSupply(token)), [], 30000);
  const { data: daily } = useFetch(() => getPublicDailyStats(), [], 30000);

  const tier = dashboard?.active_tier;
  const tierProgressPct = tier ? (toNum(tier.total_raised_usd) / Math.max(toNum(tier.hard_cap_usd), 1)) * 100 : 0;

  return (
    <div>
      <PageHeader title="Dashboard" description="Live presale overview." />

      {dashboardLoading && !dashboard ? (
        <LoadingBlock />
      ) : dashboardError && !dashboard ? (
        <ErrorNote>{dashboardError}</ErrorNote>
      ) : dashboard ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Raised (All-Time)" value={formatUsd(dashboard.total_raised)} tone="primary" />
            <StatCard
              label="Today's Raised"
              value={daily?.total_raised_usd !== undefined ? formatUsd(daily.total_raised_usd) : daily?.message ? '—' : '…'}
              sub={daily?.message}
              tone="green"
            />
            <StatCard label="Total Buyers" value={formatTokens(dashboard.total_buyers, 0)} />
            <StatCard
              label="Today's New Buyers"
              value={daily?.new_buyers !== undefined ? formatTokens(daily.new_buyers, 0) : daily?.message ? '—' : '…'}
              tone="green"
            />
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-dim">Current Tier</p>
                <p className="text-lg font-bold text-ink">{tier ? tier.name : 'No active tier'}</p>
              </div>
              {tier && (
                <span className="font-mono text-lg font-bold text-primary">${toNum(tier.price).toFixed(4)}</span>
              )}
            </div>
            {tier && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-ink-dim">
                  <span className="font-mono text-ink">{formatUsd(tier.total_raised_usd)}</span>
                  <span className="font-mono text-ink">{formatUsd(tier.hard_cap_usd)}</span>
                </div>
                <ProgressBar pct={tierProgressPct} />
                <p className="mt-1.5 font-mono text-xs text-ink-dim">{formatPct(tierProgressPct, 2)} filled</p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <p className="mb-3 text-xs uppercase tracking-widest text-ink-dim">Last Reconciliation</p>
              {dashboard.last_reconciliation ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={dashboard.last_reconciliation.status === 'clean' ? 'green' : 'red'}>
                      {dashboard.last_reconciliation.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm font-semibold text-ink">{dashboard.last_reconciliation.chain}</span>
                  </div>
                  <p className="text-xs text-ink-dim">
                    {dashboard.last_reconciliation.matched} matched · {dashboard.last_reconciliation.unmatched_incoming} unmatched
                    incoming · {dashboard.last_reconciliation.unmatched_records} unmatched records
                  </p>
                  <p className="text-xs text-ink-faint">{formatDateGmt4(dashboard.last_reconciliation.created_at)}</p>
                </div>
              ) : (
                <p className="text-sm text-ink-faint">No reconciliation runs yet.</p>
              )}
            </Card>

            <Card>
              <p className="mb-3 text-xs uppercase tracking-widest text-ink-dim">Webhook Health</p>
              <div className="flex items-center gap-2">
                <Badge tone={dashboard.webhook_health.status === 'healthy' ? 'green' : dashboard.webhook_health.status === 'warning' ? 'yellow' : 'red'}>
                  {dashboard.webhook_health.status}
                </Badge>
                <span className="text-xs text-ink-dim">{dashboard.webhook_health.minutes_since_last}m since last</span>
              </div>
              <p className="mt-2 text-xs text-ink-dim">{dashboard.webhook_health.message}</p>
              <p className="mt-1 text-xs text-ink-faint">{dashboard.webhook_health.webhooks_24h} webhooks in 24h</p>
            </Card>
          </div>

          <Card>
            <p className="mb-3 text-xs uppercase tracking-widest text-ink-dim">Token Supply Utilization</p>
            {supplyLoading && !supply ? (
              <LoadingBlock />
            ) : supply ? (
              <>
                <div className="mb-1.5 flex items-center justify-between text-xs text-ink-dim">
                  <span>
                    Allocated <span className="font-mono text-ink">{formatTokens(supply.total_allocated, 0)} $FDP</span>
                  </span>
                  <span>
                    Presale Max <span className="font-mono text-ink">{formatTokens(supply.presale_max, 0)} $FDP</span>
                  </span>
                </div>
                <ProgressBar pct={parseFloat(supply.utilization_pct)} tone={parseFloat(supply.utilization_pct) > 90 ? 'red' : 'primary'} />
                <p className="mt-1.5 font-mono text-xs text-ink-dim">{formatPct(supply.utilization_pct, 4)} utilized</p>
              </>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
