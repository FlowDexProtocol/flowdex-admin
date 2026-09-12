'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { Button, ErrorNote, Input, Label, Modal, Spinner } from '../ui';

export default function ImageModal({
  editor,
  open,
  onClose,
  onUpload,
}: {
  editor: Editor;
  open: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setMode('upload');
    setUrl('');
    setAlt('');
    setError(null);
    onClose();
  }

  function insert(src: string) {
    editor.chain().focus().setImage({ src, alt: alt.trim() || undefined }).run();
    handleClose();
  }

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const src = await onUpload(file);
      insert(src);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleUrlSubmit(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    if (url.trim()) insert(url.trim());
  }

  // Plain divs, not <form> — Modal renders inline (no portal), so a real
  // <form> here would nest inside BlogEditorForm's own outer form. Enter
  // is wired by hand instead, with preventDefault to stop the browser's
  // native "Enter submits the nearest ancestor form" behavior, which would
  // otherwise still reach that outer form despite this one not being one.
  return (
    <Modal open={open} onClose={handleClose} title="Insert Image">
      <div className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
        <div className="flex gap-1 rounded-lg border border-border bg-bg-soft p-1">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`min-h-9 flex-1 rounded-md text-sm font-semibold transition-colors ${mode === 'upload' ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'}`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`min-h-9 flex-1 rounded-md text-sm font-semibold transition-colors ${mode === 'url' ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'}`}
          >
            Paste URL
          </button>
        </div>

        <div>
          <Label>Alt Text</Label>
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" />
        </div>

        {mode === 'upload' ? (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary-dim' : 'border-border'
              }`}
            >
              {uploading ? (
                <>
                  <Spinner className="h-5 w-5 text-primary" />
                  <p className="text-xs text-ink-dim">Uploading…</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-dim">Drag &amp; drop an image, or</p>
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit(e)}>
            <div>
              <Label required>Image URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/image.jpg" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" disabled={!url.trim()} onClick={handleUrlSubmit}>
                Insert
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Modal>
  );
}
