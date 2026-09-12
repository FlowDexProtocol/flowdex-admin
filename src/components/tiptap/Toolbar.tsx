'use client';

// ══════════════════════════════════════════════════
// src/components/tiptap/Toolbar.tsx
// Two-row formatting toolbar + a third row that only appears while the
// cursor is inside a table (add/remove rows & columns, merge/split cells).
// Sticks to the top of the editor's scroll container via CSS (see
// RichTextEditor.tsx's `sticky top-0` wrapper).
// ══════════════════════════════════════════════════

import { useEffect, useState, type ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import LinkModal from './LinkModal';
import ImageModal from './ImageModal';
import YoutubeModal from './YoutubeModal';
import TablePicker from './TablePicker';
import ColorPicker from './ColorPicker';
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BlockquoteIcon,
  BoldIcon,
  BulletListIcon,
  ChevronDownIcon,
  ClearFormatIcon,
  CodeBlockIcon,
  HighlightIcon,
  HrIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  RedoIcon,
  StrikeIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableIcon,
  TextColorIcon,
  UnderlineIcon,
  UndoIcon,
  YoutubeIcon,
} from './Icons';

const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32];

function ToolButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-md px-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? 'bg-primary-dim text-primary' : 'text-ink-faint hover:bg-white/5 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-border" />;
}

export default function Toolbar({ editor, onImageUpload }: { editor: Editor; onImageUpload: (file: File) => Promise<string> }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  // Ctrl/Cmd+K opens the link modal from anywhere in the editor — TipTap's
  // extensions don't include a default binding for it since "open a modal"
  // isn't something a headless editor can own.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && editor.isFocused) {
        e.preventDefault();
        setLinkOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editor]);

  // useEditorState subscribes to exactly this derived snapshot so the
  // toolbar re-renders on every selection/content change without every
  // button re-deriving `editor.isActive(...)` independently on each of
  // Editor's own transaction events.
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor.isActive('bold'),
      italic: ctx.editor.isActive('italic'),
      underline: ctx.editor.isActive('underline'),
      strike: ctx.editor.isActive('strike'),
      subscript: ctx.editor.isActive('subscript'),
      superscript: ctx.editor.isActive('superscript'),
      bulletList: ctx.editor.isActive('bulletList'),
      orderedList: ctx.editor.isActive('orderedList'),
      blockquote: ctx.editor.isActive('blockquote'),
      codeBlock: ctx.editor.isActive('codeBlock'),
      link: ctx.editor.isActive('link'),
      table: ctx.editor.isActive('table'),
      alignLeft: ctx.editor.isActive({ textAlign: 'left' }),
      alignCenter: ctx.editor.isActive({ textAlign: 'center' }),
      alignRight: ctx.editor.isActive({ textAlign: 'right' }),
      alignJustify: ctx.editor.isActive({ textAlign: 'justify' }),
      headingLevel: [2, 3, 4].find((l) => ctx.editor.isActive('heading', { level: l })) ?? 0,
      fontSize: (ctx.editor.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  });

  return (
    <div className="sticky top-0 z-20 rounded-t-lg border-b border-border bg-card-hover">
      {/* Row 1 — text formatting */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <select
          aria-label="Heading level"
          value={state.headingLevel}
          onChange={(e) => {
            const level = Number(e.target.value);
            if (level === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run();
          }}
          className="h-9 shrink-0 rounded-md border border-border bg-bg-soft px-2 text-xs text-ink-dim outline-none"
        >
          <option value={0}>Normal text</option>
          <option value={2}>Heading 2</option>
          <option value={3}>Heading 3</option>
          <option value={4}>Heading 4</option>
        </select>

        <select
          aria-label="Font size"
          value={state.fontSize}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(`${v}px`).run();
          }}
          className="h-9 shrink-0 rounded-md border border-border bg-bg-soft px-2 text-xs text-ink-dim outline-none"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <Separator />

        <ToolButton title="Bold (Ctrl+B)" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon />
        </ToolButton>
        <ToolButton title="Italic (Ctrl+I)" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon />
        </ToolButton>
        <ToolButton title="Underline (Ctrl+U)" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon />
        </ToolButton>
        <ToolButton title="Strikethrough (Ctrl+Shift+X)" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <StrikeIcon />
        </ToolButton>
        <ToolButton title="Subscript" active={state.subscript} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <SubscriptIcon />
        </ToolButton>
        <ToolButton title="Superscript" active={state.superscript} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <SuperscriptIcon />
        </ToolButton>

        <div className="relative">
          <ToolButton title="Text color" onClick={() => setTextColorOpen((v) => !v)}>
            <TextColorIcon />
            <ChevronDownIcon />
          </ToolButton>
          <ColorPicker
            open={textColorOpen}
            onClose={() => setTextColorOpen(false)}
            presets="text"
            onPick={(hex) => editor.chain().focus().setColor(hex).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />
        </div>
        <div className="relative">
          <ToolButton title="Highlight" onClick={() => setHighlightOpen((v) => !v)}>
            <HighlightIcon />
            <ChevronDownIcon />
          </ToolButton>
          <ColorPicker
            open={highlightOpen}
            onClose={() => setHighlightOpen(false)}
            presets="highlight"
            onPick={(hex) => editor.chain().focus().toggleHighlight({ color: hex }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />
        </div>
        <ToolButton
          title="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <ClearFormatIcon />
        </ToolButton>
      </div>

      {/* Row 2 — structure + insert */}
      <div className="flex flex-wrap items-center gap-0.5 border-t border-border/60 px-2 py-1.5">
        <ToolButton title="Bullet list (Ctrl+Shift+8)" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <BulletListIcon />
        </ToolButton>
        <ToolButton title="Numbered list (Ctrl+Shift+7)" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <OrderedListIcon />
        </ToolButton>
        <ToolButton title="Blockquote (Ctrl+Shift+B)" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <BlockquoteIcon />
        </ToolButton>
        <ToolButton title="Code block" active={state.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <CodeBlockIcon />
        </ToolButton>
        <ToolButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <HrIcon />
        </ToolButton>

        <Separator />

        <ToolButton title="Align left" active={state.alignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeftIcon />
        </ToolButton>
        <ToolButton title="Align center" active={state.alignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenterIcon />
        </ToolButton>
        <ToolButton title="Align right" active={state.alignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRightIcon />
        </ToolButton>
        <ToolButton title="Justify" active={state.alignJustify} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustifyIcon />
        </ToolButton>

        <Separator />

        <ToolButton title="Insert link (Ctrl+K)" active={state.link} onClick={() => setLinkOpen(true)}>
          <LinkIcon />
        </ToolButton>
        <ToolButton title="Insert image" onClick={() => setImageOpen(true)}>
          <ImageIcon />
        </ToolButton>
        <ToolButton title="Insert YouTube video" onClick={() => setYoutubeOpen(true)}>
          <YoutubeIcon />
        </ToolButton>
        <div className="relative">
          <ToolButton title="Insert table" active={state.table} onClick={() => setTableOpen((v) => !v)}>
            <TableIcon />
          </ToolButton>
          <TablePicker editor={editor} open={tableOpen} onClose={() => setTableOpen(false)} />
        </div>

        <Separator />

        <ToolButton title="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <UndoIcon />
        </ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <RedoIcon />
        </ToolButton>
      </div>

      {/* Row 3 — only while the cursor is inside a table */}
      {state.table && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border/60 px-2 py-1.5 text-xs">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowBefore().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            + Row above
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            + Row below
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            Delete row
          </button>
          <Separator />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnBefore().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            + Col left
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            + Col right
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            Delete col
          </button>
          <Separator />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().mergeOrSplit().run()} className="rounded-md px-2 py-1.5 text-ink-faint hover:bg-white/5 hover:text-ink">
            Merge / Split
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()} className="rounded-md px-2 py-1.5 text-red-400 hover:bg-red/10">
            Delete table
          </button>
        </div>
      )}

      <LinkModal editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />
      <ImageModal editor={editor} open={imageOpen} onClose={() => setImageOpen(false)} onUpload={onImageUpload} />
      <YoutubeModal editor={editor} open={youtubeOpen} onClose={() => setYoutubeOpen(false)} />
    </div>
  );
}
