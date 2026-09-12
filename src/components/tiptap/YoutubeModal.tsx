'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Button, Input, Label, Modal } from '../ui';

export default function YoutubeModal({ editor, open, onClose }: { editor: Editor; open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState('');

  function handleClose() {
    setUrl('');
    onClose();
  }

  function handleSubmit() {
    const src = url.trim();
    if (!src) return;
    editor.chain().focus().setYoutubeVideo({ src, width: 640, height: 360 }).run();
    handleClose();
  }

  // Plain div, not <form> — Modal renders inline (no portal), so a real
  // <form> here would nest inside BlogEditorForm's own outer form; Enter
  // is wired by hand with preventDefault to stop the browser's native
  // "Enter submits the nearest ancestor form" behavior from reaching it.
  return (
    <Modal open={open} onClose={handleClose} title="Insert YouTube Video">
      <div
        className="space-y-4"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <div>
          <Label required>YouTube URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!url.trim()} onClick={handleSubmit}>
            Insert
          </Button>
        </div>
      </div>
    </Modal>
  );
}
