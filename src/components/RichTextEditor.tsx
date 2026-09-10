'use client';

// ══════════════════════════════════════════════════
// src/components/RichTextEditor.tsx
// Dark-themed wrapper around react-quill-new for blog post content — plain
// <textarea> replaced per the CMS blog editor overhaul. Quill touches
// `document` at import time, so the library itself is loaded via
// next/dynamic(ssr:false) here rather than a top-level import — that keeps
// this file itself safely importable from a server-rendered page.
// ══════════════════════════════════════════════════

import dynamic from 'next/dynamic';
import { useMemo, useRef, type ComponentProps, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import type ReactQuillType from 'react-quill-new';
import { Spinner } from './ui';

// next/dynamic's own type doesn't know the loaded component accepts a ref
// (it does — ReactQuill is a class component) — corrected here rather than
// dropping the ref this file actually needs for the image-upload handler.
// react-quill-new doesn't export its props type by name, so it's pulled
// back out of the default-exported class itself via ComponentProps.
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-bg-soft">
      <Spinner className="h-5 w-5 text-primary" />
    </div>
  ),
}) as unknown as ForwardRefExoticComponent<ComponentProps<typeof ReactQuillType> & RefAttributes<ReactQuillType>>;

const FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'code-block', 'link', 'image'];

export default function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = 'Write your post…',
}: {
  value: string;
  onChange: (html: string) => void;
  // Uploads the picked file and resolves to the URL to embed — the editor
  // itself has no API access, so this is threaded down from whichever page
  // owns adminFetch (mirrors ImageUploader's own upload flow).
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
}) {
  const quillRef = useRef<ReactQuillType | null>(null);

  const modules = useMemo(
    () => ({
      // The browser's native Ctrl/Cmd+A selects one position past Quill's
      // real content (its always-present trailing newline). Formatting that
      // over-extended selection makes Quill create a phantom cursor-holder
      // node instead of wrapping the actual text — e.g. Ctrl+A then Bold
      // visibly does nothing. Overriding selectAll to stop one index short
      // of quill.getLength() (which already counts that trailing newline)
      // keeps the selection inside real content so formatting applies to it.
      keyboard: {
        bindings: {
          selectAll: {
            key: 'a',
            shortKey: true,
            handler(this: { quill: import('quill').default }) {
              this.quill.setSelection(0, this.quill.getLength() - 1, 'user');
              // Returning false tells Quill's keyboard module to
              // preventDefault() the native browser Select-All — otherwise
              // it fires right after this and re-overselects past the end.
              return false;
            },
          },
        },
      },
      toolbar: {
        container: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          // Overrides Quill's default image handler, which would otherwise
          // inline the picked file as a base64 data: URI straight into the
          // post content — this uploads it via POST /admin/upload instead
          // and embeds the resulting /uploads/... URL.
          image() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              const editor = quillRef.current?.getEditor();
              const range = editor?.getSelection(true);
              try {
                const url = await onImageUpload(file);
                if (editor && range) {
                  editor.insertEmbed(range.index, 'image', url, 'user');
                  editor.setSelection(range.index + 1, 0, 'user');
                }
              } catch {
                // onImageUpload's caller is responsible for surfacing the
                // error (toast) — nothing to insert if it failed.
              }
            };
            input.click();
          },
        },
      },
    }),
    [onImageUpload]
  );

  return (
    <div className="overflow-hidden rounded-xl">
      <ReactQuill ref={quillRef} theme="snow" value={value} onChange={onChange} modules={modules} formats={FORMATS} placeholder={placeholder} />
    </div>
  );
}
