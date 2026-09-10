'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getDashboard, getPublicDailyStats, getStatsByChain, getStatsDaily, getSubscriberCount, getSupply } from '@/lib/api';
import { formatDateGmt4, formatPct, formatSecondsAgo, formatTokens, formatUsd, toNum } from '@/lib/format';
import { Badge, Button, Card, ErrorNote, LoadingBlock, PageHeader, ProgressBar, StatCard } from '@/components/ui';
import { BuyersDonutChart, PurchasesLineChart, RevenueBarChart } from '@/components/DashboardCharts';

const REFRESH_INTERVAL_MS = 60000;

const SITE_URL = 'https://flowdexprotocol.com';
const BUY_PAGE_URL = 'https://purchase.flowdexprotocol.com';

function QuickActionLink({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) {
  const className =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-4 text-sm font-semibold text-ink transition-colors hover:border-primary/50 whitespace-nowrap';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function QuickActionsBar() {
  return (
    <Card className="mb-6 !p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-xs font-semibold uppercase tracking-widest text-ink-faint">Quick actions</span>
        <QuickActionLink href="/cms/blog/new">+ New Blog Post</QuickActionLink>
        <QuickActionLink href="/cms/banners?new=1">+ Add Banner</QuickActionLink>
        <QuickActionLink href={SITE_URL} external>
          View Site ↗
        </QuickActionLink>
        <QuickActionLink href={BUY_PAGE_URL} external>
          View Buy Page ↗
        </QuickActionLink>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { adminFetch } = useAdminAuth();

  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    reload: reloadDashboard,
  } = useFetch(() => adminFetch((token) => getDashboard(token)), [], REFRESH_INTERVAL_MS);
  const { data: supply, loading: supplyLoading, reload: reloadSupply } = useFetch(
    () => adminFetch((token) => getSupply(token)),
    [],
    REFRESH_INTERVAL_MS
  );
  const { data: daily, reload: reloadDaily } = useFetch(() => getPublicDailyStats(), [], REFRESH_INTERVAL_MS);
  const { data: dailyStats, reload: reloadDailyStats } = useFetch(
    () => adminFetch((token) => getStatsDaily(token)),
    [],
    REFRESH_INTERVAL_MS
  );
  const { data: chainStats, reload: reloadChainStats } = useFetch(
    () => adminFetch((token) => getStatsByChain(token)),
    [],
    REFRESH_INTERVAL_MS
  );
  const { data: subscribers, reload: reloadSubscribers } = useFetch(
    () => adminFetch((token) => getSubscriberCount(token)),
    [],
    REFRESH_INTERVAL_MS
  );

  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (dashboard) setLastUpdated(Date.now());
  }, [dashboard]);

  useEffect(() => {
    const id = setInterval(() => setSecondsAgo((Date.now() - lastUpdated) / 1000), 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      reloadDashboard(),
      reloadSupply(),
      reloadDaily(),
      reloadDailyStats(),
      reloadChainStats(),
      reloadSubscribers(),
    ]);
    setLastUpdated(Date.now());
    setRefreshing(false);
  }

  const tier = dashboard?.active_tier;
  const tierProgressPct = tier ? (toNum(tier.total_raised_usd) / Math.max(toNum(tier.hard_cap_usd), 1)) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live presale overview."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-ink-faint">Last updated: {formatSecondsAgo(secondsAgo)}</span>
            <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        }
      />

      <QuickActionsBar />

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
            <StatCard
              label="Active Buyers"
              value={formatTokens(dashboard.total_buyers, 0)}
              sub={`${formatTokens(dashboard.total_wallets_connected, 0)} wallets connected`}
            />
            <StatCard
              label="Today's New Buyers"
              value={daily?.new_buyers !== undefined ? formatTokens(daily.new_buyers, 0) : daily?.message ? '—' : '…'}
              tone="green"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Email Subscribers" value={subscribers ? formatTokens(subscribers.count, 0) : '…'} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <p className="mb-4 text-xs uppercase tracking-widest text-ink-dim">Purchases Over Time (30 Days)</p>
              <PurchasesLineChart data={dailyStats || []} />
            </Card>
            <Card>
              <p className="mb-4 text-xs uppercase tracking-widest text-ink-dim">Revenue by Day (30 Days)</p>
              <RevenueBarChart data={dailyStats || []} />
            </Card>
          </div>

          <Card>
            <p className="mb-4 text-xs uppercase tracking-widest text-ink-dim">Buyers by Chain</p>
            <BuyersDonutChart data={chainStats || []} />
          </Card>

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
                <Badge tone={dashboard.webhook_health.status === 'healthy' ? 'green' : dashboard.webhook_health.status === 'warning' ? 'amber' : 'red'}>
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
