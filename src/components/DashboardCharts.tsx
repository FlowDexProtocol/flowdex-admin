'use client';

import { EmptyState } from './ui';
import { toNum } from '@/lib/format';
import type { ChainStat, DailyPurchaseStat } from '@/lib/types';

// Simple hand-rolled SVG charts — no charting library needed for 3 small
// dashboard visualizations. viewBox + preserveAspectRatio="none" keeps
// each chart responsive without a resize observer.
const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = 28;

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
}

// Picks ~5 evenly-spaced label indexes out of N points, always including
// the first and last, so a 30-point axis doesn't get cluttered.
function axisLabelIndexes(length: number): number[] {
  if (length <= 5) return Array.from({ length }, (_, i) => i);
  const step = (length - 1) / 4;
  return Array.from({ length: 5 }, (_, i) => Math.round(i * step));
}

export function PurchasesLineChart({ data }: { data: DailyPurchaseStat[] }) {
  if (data.length === 0) return <EmptyState>No purchases yet</EmptyState>;

  const counts = data.map((d) => toNum(d.purchase_count));
  const maxCount = Math.max(...counts, 1);
  const innerWidth = CHART_WIDTH - PADDING * 2;
  const innerHeight = CHART_HEIGHT - PADDING * 2;

  const points = data.map((d, i) => {
    const x = PADDING + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2);
    const y = PADDING + innerHeight - (toNum(d.purchase_count) / maxCount) * innerHeight;
    return { x, y };
  });

  const labelIdx = axisLabelIndexes(data.length);

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 20}`} className="w-full" preserveAspectRatio="none">
      <line x1={PADDING} y1={PADDING} x2={PADDING} y2={CHART_HEIGHT - PADDING} stroke="#1A2A3F" strokeWidth="1" />
      <line
        x1={PADDING}
        y1={CHART_HEIGHT - PADDING}
        x2={CHART_WIDTH - PADDING}
        y2={CHART_HEIGHT - PADDING}
        stroke="#1A2A3F"
        strokeWidth="1"
      />
      <text x={PADDING - 4} y={PADDING} textAnchor="end" fontSize="9" fill="#8899AA">
        {maxCount}
      </text>
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#627EEA"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#627EEA" />
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={points[i].x} y={CHART_HEIGHT + 12} textAnchor="middle" fontSize="9" fill="#8899AA">
          {formatAxisDate(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

export function RevenueBarChart({ data }: { data: DailyPurchaseStat[] }) {
  if (data.length === 0) return <EmptyState>No purchases yet</EmptyState>;

  const revenues = data.map((d) => toNum(d.usd_raised));
  const maxRevenue = Math.max(...revenues, 1);
  const innerWidth = CHART_WIDTH - PADDING * 2;
  const innerHeight = CHART_HEIGHT - PADDING * 2;
  const barGap = 2;
  const barWidth = Math.max(1, innerWidth / data.length - barGap);

  const labelIdx = axisLabelIndexes(data.length);

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 20}`} className="w-full" preserveAspectRatio="none">
      <line
        x1={PADDING}
        y1={CHART_HEIGHT - PADDING}
        x2={CHART_WIDTH - PADDING}
        y2={CHART_HEIGHT - PADDING}
        stroke="#1A2A3F"
        strokeWidth="1"
      />
      <text x={PADDING - 4} y={PADDING} textAnchor="end" fontSize="9" fill="#8899AA">
        ${Math.round(maxRevenue).toLocaleString()}
      </text>
      {data.map((d, i) => {
        const value = toNum(d.usd_raised);
        const barHeight = (value / maxRevenue) * innerHeight;
        const x = PADDING + i * (innerWidth / data.length);
        const y = CHART_HEIGHT - PADDING - barHeight;
        return <rect key={i} x={x} y={y} width={barWidth} height={barHeight} fill="#00FF88" rx="1" />;
      })}
      {labelIdx.map((i) => (
        <text
          key={i}
          x={PADDING + i * (innerWidth / data.length) + barWidth / 2}
          y={CHART_HEIGHT + 12}
          textAnchor="middle"
          fontSize="9"
          fill="#8899AA"
        >
          {formatAxisDate(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627EEA',
  bsc: '#F0B90B',
  solana: '#9945FF',
  bitcoin: '#F7931A',
  tron: '#FF0013',
};
const FALLBACK_CHAIN_COLOR = '#8899AA';
const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'ETH',
  bsc: 'BSC',
  solana: 'SOL',
  bitcoin: 'BTC',
  tron: 'TRON',
};

export function BuyersDonutChart({ data }: { data: ChainStat[] }) {
  const total = data.reduce((sum, d) => sum + toNum(d.count), 0);
  if (data.length === 0 || total === 0) return <EmptyState>No data yet</EmptyState>;

  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  const dashes = data.map((d) => (toNum(d.count) / total) * circumference);
  const offsets = dashes.map((_, i) => dashes.slice(0, i).reduce((a, b) => a + b, 0));
  const segments = data.map((d, i) => ({
    chain: d.chain,
    color: CHAIN_COLORS[d.chain] || FALLBACK_CHAIN_COLOR,
    dash: dashes[i],
    offset: offsets[i],
    pct: (toNum(d.count) / total) * 100,
  }));

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 200 200" className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#1A2A3F" strokeWidth={strokeWidth} />
        {segments.map((s) => (
          <circle
            key={s.chain}
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset}
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:flex-col sm:justify-start">
        {segments.map((s) => (
          <div key={s.chain} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-semibold text-ink">{CHAIN_LABELS[s.chain] || s.chain}</span>
            <span className="text-ink-faint">{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
