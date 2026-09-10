'use client';

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { truncateWallet } from '@/lib/format';

export function Card({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-dim">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-[#03131a] hover:bg-primary/90',
    secondary: 'bg-card-hover text-ink border border-border hover:border-primary/50',
    ghost: 'text-ink-dim hover:text-ink hover:bg-white/5',
    danger: 'bg-red text-white hover:bg-red/90',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

type BadgeTone = 'primary' | 'green' | 'red' | 'purple' | 'amber' | 'neutral';

export function Badge({ children, tone = 'primary', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const tones: Record<BadgeTone, string> = {
    primary: 'bg-primary-dim text-primary',
    green: 'bg-green-dim text-green',
    red: 'bg-red-dim text-red',
    purple: 'bg-purple-dim text-purple',
    amber: 'bg-amber-dim text-amber',
    neutral: 'bg-white/5 text-ink-dim',
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ProgressBar({ pct, className = '', tone = 'primary' }: { pct: number; className?: string; tone?: 'primary' | 'green' | 'red' }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const colors: Record<string, string> = {
    primary: 'from-primary to-purple',
    green: 'from-green to-primary',
    red: 'from-red to-yellow',
  };
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-white/5 ${className}`}>
      <div className={`h-full rounded-full bg-gradient-to-r ${colors[tone]} transition-[width] duration-700 ease-out`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-dim">{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-red/30 bg-red-dim px-4 py-3 text-sm text-red">{children}</div>;
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-green/30 bg-green-dim px-4 py-3 text-sm text-green">{children}</div>;
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="h-6 w-6 text-primary" />
    </div>
  );
}

// Shimmering placeholder rows shaped like a real table — shown in place of
// LoadingBlock's spinner on the list pages, so the page doesn't jump/reflow
// once real rows arrive (a spinner-then-table swap does).
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-3 py-3.5">
                  <div className="h-3.5 animate-pulse rounded bg-white/5" style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Same shimmer, for grid/card layouts (Team) instead of a table.
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/5" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/60 ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`min-h-11 w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/60 ${className}`}
      {...rest}
    />
  );
}

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-dim">
      {children}
      {required && (
        <span className="ml-0.5 text-red" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

// Inline validation message shown directly under an invalid field — pairs
// with the `error` prop most form fields below accept.
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-xs text-red" role="alert">
      {children}
    </p>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-green' : 'bg-white/10'}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </button>
  );
}

export function IconButton({
  onClick,
  title,
  variant = 'ghost',
  children,
}: {
  onClick: () => void;
  title: string;
  variant?: 'ghost' | 'danger';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors ${
        variant === 'danger' ? 'text-ink-dim hover:border-red/50 hover:text-red' : 'text-ink-dim hover:border-primary/50 hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'ink' | 'primary' | 'green' | 'red' | 'purple';
}) {
  const toneClass: Record<string, string> = {
    ink: 'text-ink',
    primary: 'text-primary',
    green: 'text-green',
    red: 'text-red',
    purple: 'text-purple',
  };
  return (
    <Card>
      <p className="text-xs uppercase tracking-widest text-ink-dim">{label}</p>
      <div className={`mt-1.5 font-mono text-2xl font-bold ${toneClass[tone]}`}>{value}</div>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </Card>
  );
}

// Windowed page numbers around the current page, plus first/last, with
// 'ellipsis' markers for the gaps — avoids rendering hundreds of buttons
// for a large result set.
function getPageWindow(page: number, pages: number): (number | 'ellipsis')[] {
  const set = new Set<number>([1, pages]);
  for (let p = page - 2; p <= page + 2; p++) {
    if (p >= 1 && p <= pages) set.add(p);
  }
  const sorted = Array.from(set).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis');
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({
  page,
  pages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const items = getPageWindow(page, Math.max(pages, 1));

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-dim">
        Showing {start.toLocaleString()}-{end.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="!w-auto"
          aria-label="Rows per page"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="secondary" className="!px-3 !py-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Prev
          </Button>
          {items.map((it, i) =>
            it === 'ellipsis' ? (
              <span key={`e${i}`} className="px-1 text-ink-faint">
                …
              </span>
            ) : (
              <button
                key={it}
                onClick={() => onPageChange(it)}
                className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                  it === page ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:bg-white/5 hover:text-ink'
                }`}
              >
                {it}
              </button>
            )
          )}
          <Button variant="secondary" className="!px-3 !py-2" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export const th = 'sticky top-0 z-10 bg-card-hover px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-dim whitespace-nowrap';
export const td = 'px-3 py-2.5 align-middle';
// For a table's rightmost "actions" column, in addition to `th`/`td`, so it
// stays put while the table scrolls horizontally (long tables) or
// vertically (sticky header still applies via top-0 here too).
export const thActions = 'sticky right-0 top-0 z-20 bg-card-hover px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-dim whitespace-nowrap';
export const tdActions = 'sticky right-0 z-[5] bg-card px-3 py-2.5 align-middle';

// max-h + overflow-auto (not just overflow-x-auto) so `th`'s sticky top-0
// actually has something to stick against — a table can be very tall (many
// rows) without the whole page needing to scroll past its header.
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  const [mounted, setMounted] = useState(open);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Escape closes; auto-focus the first focusable field so admins can start
  // typing immediately without reaching for the mouse.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const id = requestAnimationFrame(() => {
      const focusable = bodyRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
      );
      focusable?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* h-full on mobile so the sheet fills the viewport; sm:max-h-[80vh] caps
          desktop height so the body (not the whole modal) scrolls once its
          content — e.g. the banner form's 9+ fields — exceeds that. */}
      <div
        className={`relative flex h-full max-h-full w-full flex-col border-border bg-card shadow-2xl transition-all sm:h-auto sm:max-h-[80vh] ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        } sm:rounded-2xl sm:border ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-dim hover:text-ink"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Truncated wallet address + click-to-copy — used anywhere a full wallet
// address is shown in a table so admins don't have to select/copy manually.
export function CopyableWallet({ wallet, lead = 6, trail = 4 }: { wallet: string | null | undefined; lead?: number; trail?: number }) {
  const [copied, setCopied] = useState(false);

  if (!wallet) return <span className="text-ink-faint">—</span>;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(wallet as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (permissions/insecure context) — no-op
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy address'}
      className="group inline-flex items-center gap-1.5"
    >
      <Mono>{truncateWallet(wallet, lead, trail)}</Mono>
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 text-green" aria-hidden="true">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

