'use client';

// ══════════════════════════════════════════════════
// src/components/RichTextEditor.tsx
// TipTap (ProseMirror) rich text editor for blog post content — replaces
// the previous react-quill-new editor entirely. Same external contract
// (value/onChange/onImageUpload/placeholder) as before, so BlogEditorForm
// didn't need to change how it uses this component.
// ══════════════════════════════════════════════════

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Youtube from '@tiptap/extension-youtube';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';
import { resolveAssetUrl } from '@/lib/api';
import { ResizableImage } from './tiptap/ResizableImage';
import { CustomStrike } from './tiptap/CustomStrike';
import Toolbar from './tiptap/Toolbar';

// Safety net for any relative /uploads/... image src that reaches saved
// HTML without having gone through the insert-time upload flow (e.g. a
// URL typed by hand into the "Paste URL" tab, or content pasted in from
// elsewhere) — everything inserted via the toolbar's own upload button is
// already absolute by the time it lands in the doc (onImageUpload already
// resolves it), so this only ever has stragglers left to catch.
function resolveRelativeImageUrls(html: string): string {
  return html.replace(/(<img[^>]*\bsrc=")([^"]+)(")/gi, (match, pre, src, post) => `${pre}${resolveAssetUrl(src)}${post}`);
}

export default function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = 'Write your post…',
}: {
  value: string;
  onChange: (html: string) => void;
  // Uploads the picked file and resolves to the absolute URL to embed —
  // the editor itself has no API access, so this is threaded down from
  // whichever page owns adminFetch (mirrors ImageUploader's own flow).
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Replaced with their standalone packages below — link/underline
        // for explicit configuration (open-in-new-tab, autolink on paste),
        // strike for its Ctrl+Shift+X shortcut.
        link: false,
        underline: false,
        strike: false,
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      CustomStrike,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      ResizableImage.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, HTMLAttributes: { class: 'yt-embed' } }),
      Subscript,
      Superscript,
      Typography,
      CharacterCount,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'tiptap-body',
      },
    },
    onUpdate({ editor }) {
      onChange(resolveRelativeImageUrls(editor.getHTML()));
    },
  });

  // The form component may reset `value` out from under the editor (e.g.
  // loading a post to edit after the editor already mounted with empty
  // content) — sync it in without fighting the user's own typing by only
  // doing so when the incoming value actually differs from current content.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="min-h-[500px] animate-pulse rounded-lg border border-border bg-card" />;
  }

  const words = editor.storage.characterCount.words();
  const characters = editor.storage.characterCount.characters();

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Toolbar editor={editor} onImageUpload={onImageUpload} />
      <div className="max-h-[70vh] overflow-y-auto bg-card">
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-end border-t border-border bg-card-hover px-3 py-1.5 text-xs text-ink-faint">
        {words} words · {characters} characters
      </div>
    </div>
  );
}
