'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

const MAX_GRID = 6;

export default function TablePicker({ editor, open, onClose }: { editor: Editor; open: boolean; onClose: () => void }) {
  const [hover, setHover] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  function insert(rows: number, cols: number) {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    onClose();
  }

  const cells = [];
  for (let r = 1; r <= MAX_GRID; r++) {
    for (let c = 1; c <= MAX_GRID; c++) {
      const active = r <= hover.rows && c <= hover.cols;
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          onMouseEnter={() => setHover({ rows: r, cols: c })}
          onClick={() => insert(r, c)}
          className={`h-5 w-5 border transition-colors ${active ? 'border-primary bg-primary-dim' : 'border-border bg-bg-soft'}`}
        />
      );
    }
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 rounded-lg border border-border bg-card p-3 shadow-xl"
      onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
    >
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${MAX_GRID}, minmax(0,1fr))` }}>
        {cells}
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint">
        {hover.rows > 0 ? `${hover.rows} × ${hover.cols}` : 'Insert table'}
      </p>
    </div>
  );
}
