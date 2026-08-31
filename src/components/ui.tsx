'use client';

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>{children}</div>;
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
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0';
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

type BadgeTone = 'primary' | 'green' | 'red' | 'purple' | 'yellow' | 'neutral';

export function Badge({ children, tone = 'primary', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const tones: Record<BadgeTone, string> = {
    primary: 'bg-primary-dim text-primary',
    green: 'bg-green-dim text-green',
    red: 'bg-red-dim text-red',
    purple: 'bg-purple-dim text-purple',
    yellow: 'bg-yellow-dim text-yellow',
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

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/60 ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60 ${className}`}
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

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-dim">{children}</label>;
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
      <div className={`mt-1.5 text-2xl font-bold ${toneClass[tone]}`}>{value}</div>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </Card>
  );
}

export const th = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-dim whitespace-nowrap';
export const td = 'px-3 py-2.5 align-middle';

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
