'use client';

// ══════════════════════════════════════════════════
// src/components/tiptap/ResizableImage.tsx
// Extends the base @tiptap/extension-image with drag-to-resize (width
// only — height is always auto, so aspect ratio can't be broken) and
// left/center/right alignment, surfaced as a small floating toolbar that
// appears above the image only while it's selected.
// ══════════════════════════════════════════════════

import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Align = 'left' | 'center' | 'right';
const MIN_WIDTH = 80;

function AlignIcon({ align }: { align: Align }) {
  const lines =
    align === 'left'
      ? [
          [3, 6, 21, 6],
          [3, 12, 15, 12],
          [3, 18, 18, 18],
        ]
      : align === 'right'
        ? [
            [3, 6, 21, 6],
            [9, 12, 21, 12],
            [6, 18, 21, 18],
          ]
        : [
            [3, 6, 21, 6],
            [6, 12, 18, 12],
            [4, 18, 20, 18],
          ];
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      {lines.map(([x1, y1, x2], i) => (
        <path key={i} d={`M${x1} ${y1}h${x2 - x1}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function ImageNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, alt, title, width, align } = node.attrs as {
    src: string;
    alt: string | null;
    title: string | null;
    width: string | null;
    align: Align | null;
  };
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback(
    (e: ReactPointerEvent, side: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const startX = e.clientX;
      const startWidth = img.getBoundingClientRect().width;
      setResizing(true);

      function onMove(ev: PointerEvent) {
        const delta = side === 'right' ? ev.clientX - startX : startX - ev.clientX;
        const next = Math.max(MIN_WIDTH, Math.round(startWidth + delta));
        updateAttributes({ width: `${next}px` });
      }
      function onUp() {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [updateAttributes]
  );

  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <NodeViewWrapper as="div" className={`my-4 flex max-w-full ${justify}`} data-drag-handle>
      <div className="relative inline-block max-w-full" style={{ width: width || 'auto' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || undefined}
          className={`block h-auto w-full max-w-full rounded-lg ${selected ? 'outline outline-2 outline-primary' : ''}`}
          draggable={false}
        />
        {selected && (
          <>
            <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-lg">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  title={`Align ${a}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateAttributes({ align: a })}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    (align ?? 'left') === a ? 'bg-primary-dim text-primary' : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  <AlignIcon align={a} />
                </button>
              ))}
              <div className="mx-0.5 h-5 w-px bg-border" />
              <button
                type="button"
                title="Remove image"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => deleteNode()}
                className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red/10"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div
              onPointerDown={(e) => startResize(e, 'left')}
              className={`absolute left-0 top-1/2 h-8 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full bg-primary ${resizing ? '' : 'opacity-80 hover:opacity-100'}`}
            />
            <div
              onPointerDown={(e) => startResize(e, 'right')}
              className={`absolute right-0 top-1/2 h-8 w-2.5 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-full bg-primary ${resizing ? '' : 'opacity-80 hover:opacity-100'}`}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// Only one of width/align emits the `style` HTML attribute (align's, since
// its renderHTML sees the full attribute set) — TipTap's mergeAttributes
// doesn't guarantee concatenating two different attributes that both
// independently emit `style`, so having two sources fight over the same
// key is avoided entirely rather than relied on to merge correctly.
export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.style.width || element.getAttribute('width') || null,
        renderHTML: () => ({}),
      },
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-align') || null,
        renderHTML: (attributes) => {
          const parts = ['display:block'];
          if (attributes.width) parts.push(`width:${attributes.width}`);
          if (attributes.align === 'center') parts.push('margin-left:auto', 'margin-right:auto');
          else if (attributes.align === 'right') parts.push('margin-left:auto', 'margin-right:0');
          else parts.push('margin-left:0', 'margin-right:auto');
          return { style: `${parts.join(';')};`, ...(attributes.align ? { 'data-align': attributes.align } : {}) };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
