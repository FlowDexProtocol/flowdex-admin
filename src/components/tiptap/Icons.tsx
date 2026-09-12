// ══════════════════════════════════════════════════
// src/components/tiptap/Icons.tsx
// Small hand-drawn line icons for the toolbar — matches the rest of the
// admin dashboard's convention of inline SVGs with no icon library
// dependency.
// ══════════════════════════════════════════════════

import type { SVGProps } from 'react';

function S({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...rest}>
      {children}
    </svg>
  );
}
const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const BoldIcon = () => (
  <S><path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z" {...stroke} /></S>
);
export const ItalicIcon = () => (
  <S><path d="M10 4h8M6 20h8M14 4 10 20" {...stroke} /></S>
);
export const UnderlineIcon = () => (
  <S><path d="M6 4v7a6 6 0 0 0 12 0V4M4 20h16" {...stroke} /></S>
);
export const StrikeIcon = () => (
  <S><path d="M5 12h14M7 6.5C7 5 9 4 12 4s5 1 5 3-2 2.5-5 3M17 17.5c0 1.5-2 2.5-5 2.5s-5-1-5-3" {...stroke} /></S>
);
export const SubscriptIcon = () => (
  <S><path d="M4 6l8 10M12 6l-8 10" {...stroke} /><path d="M15 19h5M17.5 16c1-1 2.5-1.2 2.5.3 0 1-2.5 1.7-2.5 2.7h2.5" {...stroke} strokeWidth={1.5} /></S>
);
export const SuperscriptIcon = () => (
  <S><path d="M4 8l8 10M12 8l-8 10" {...stroke} /><path d="M15 6h5M17.5 3c1-1 2.5-1.2 2.5.3 0 1-2.5 1.7-2.5 2.7h2.5" {...stroke} strokeWidth={1.5} /></S>
);
export const TextColorIcon = () => (
  <S><path d="M9 15h6M6 19l5-14h2l5 14M7.5 12h9" {...stroke} /></S>
);
export const HighlightIcon = () => (
  <S><path d="m8 15 5-5 5 5-2.5 2.5h-5zM10.5 12.5 5 18v2h2l5.5-5.5" {...stroke} /></S>
);
export const ClearFormatIcon = () => (
  <S><path d="M6 4h9l-2 16M9 20h9M4 4l16 16" {...stroke} /></S>
);
export const ChevronDownIcon = () => (
  <S width={11} height={11}><path d="m6 9 6 6 6-6" {...stroke} /></S>
);
export const BulletListIcon = () => (
  <S><circle cx="4.5" cy="6" r="1.3" fill="currentColor" /><circle cx="4.5" cy="12" r="1.3" fill="currentColor" /><circle cx="4.5" cy="18" r="1.3" fill="currentColor" /><path d="M9 6h11M9 12h11M9 18h11" {...stroke} /></S>
);
export const OrderedListIcon = () => (
  <S><path d="M9 6h11M9 12h11M9 18h11" {...stroke} /><path d="M4 5v3M4 5h1M4 8h1.5M4 12h1.5l-1.5 1.7h1.5M4 17.5h1.5v1.2H4v1.3h1.5" {...stroke} strokeWidth={1.4} /></S>
);
export const BlockquoteIcon = () => (
  <S><path d="M7 8c-2 1-3 2.6-3 5a2.5 2.5 0 1 0 2.6-2.5C6.4 8 7 8 7 8Zm10 0c-2 1-3 2.6-3 5a2.5 2.5 0 1 0 2.6-2.5C16.4 8 17 8 17 8Z" {...stroke} /></S>
);
export const CodeBlockIcon = () => (
  <S><path d="m9 8-4 4 4 4M15 8l4 4-4 4" {...stroke} /></S>
);
export const HrIcon = () => (
  <S><path d="M4 12h16" {...stroke} /></S>
);
export const AlignLeftIcon = () => (
  <S><path d="M4 6h16M4 12h10M4 18h14" {...stroke} /></S>
);
export const AlignCenterIcon = () => (
  <S><path d="M4 6h16M7 12h10M5 18h14" {...stroke} /></S>
);
export const AlignRightIcon = () => (
  <S><path d="M4 6h16M10 12h10M6 18h14" {...stroke} /></S>
);
export const AlignJustifyIcon = () => (
  <S><path d="M4 6h16M4 12h16M4 18h16" {...stroke} /></S>
);
export const LinkIcon = () => (
  <S><path d="M9 15l6-6M10 6l1.5-1.5a3.5 3.5 0 0 1 5 5L15 11M14 18l-1.5 1.5a3.5 3.5 0 0 1-5-5L9 13" {...stroke} /></S>
);
export const ImageIcon = () => (
  <S><rect x="4" y="5" width="16" height="14" rx="2" {...stroke} /><circle cx="9" cy="10" r="1.5" fill="currentColor" /><path d="m6 17 4.5-4.5 3 3L18 11l2 2" {...stroke} /></S>
);
export const YoutubeIcon = () => (
  <S><rect x="3" y="6" width="18" height="12" rx="3" {...stroke} /><path d="M11 10.5v3l3-1.5z" fill="currentColor" /></S>
);
export const TableIcon = () => (
  <S><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" {...stroke} /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15M15 4.5v15" {...stroke} strokeWidth={1.5} /></S>
);
export const UndoIcon = () => (
  <S><path d="M7 8H4V5M4 8a8 8 0 1 1 2 6.5" {...stroke} /></S>
);
export const RedoIcon = () => (
  <S><path d="M17 8h3V5M20 8a8 8 0 1 0-2 6.5" {...stroke} /></S>
);
