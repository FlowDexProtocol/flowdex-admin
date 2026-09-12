'use client';

import { useEffect, useRef, useState } from 'react';

const PRESET_COLORS = [
  '#E8ECF1', '#8899AA', '#627EEA', '#7C3AED', '#EC4899',
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#0EA5E9', '#FFFFFF', '#000000',
];

const PRESET_HIGHLIGHTS = [
  '#FEF08A', '#FDE68A', '#FECACA', '#BBF7D0', '#BFDBFE',
  '#DDD6FE', '#FBCFE8', '#E5E7EB',
];

export default function ColorPicker({
  open,
  onClose,
  onPick,
  onClear,
  presets,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (hex: string) => void;
  onClear: () => void;
  presets?: 'text' | 'highlight';
}) {
  const [custom, setCustom] = useState('#627EEA');
  const ref = useRef<HTMLDivElement>(null);
  const colors = presets === 'highlight' ? PRESET_HIGHLIGHTS : PRESET_COLORS;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-card p-3 shadow-xl">
      <div className="grid grid-cols-6 gap-1.5">
        {colors.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => {
              onPick(hex);
              onClose();
            }}
            className="h-6 w-6 rounded-md border border-border/60"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <input
          type="color"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <button
          type="button"
          onClick={() => {
            onPick(custom);
            onClose();
          }}
          className="min-h-8 flex-1 rounded-md border border-border px-2 text-xs font-semibold text-ink-dim hover:text-ink"
        >
          Use {custom}
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          onClear();
          onClose();
        }}
        className="mt-2 min-h-8 w-full rounded-md text-xs font-semibold text-ink-faint hover:text-ink"
      >
        Clear
      </button>
    </div>
  );
}
