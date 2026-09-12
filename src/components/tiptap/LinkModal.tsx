'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Button, Input, Label, Modal, Toggle } from '../ui';

export default function LinkModal({ editor, open, onClose }: { editor: Editor; open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [newTab, setNewTab] = useState(true);

  // Pre-fill from the current selection/link every time the modal opens —
  // editing an existing link shows its current URL/text/target, inserting
  // a fresh one starts blank (or with the selected text carried over).
  useEffect(() => {
    if (!open) return;
    const { from, to, empty } = editor.state.selection;
    const existingHref = editor.getAttributes('link').href as string | undefined;
    const existingTarget = editor.getAttributes('link').target as string | undefined;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
    setUrl(existingHref || '');
    setText(selectedText);
    setNewTab(existingTarget ? existingTarget === '_blank' : true);
  }, [open, editor]);

  function handleSubmit() {
    const href = url.trim();
    if (!href) return;

    const attrs = { href, target: newTab ? '_blank' : null, rel: newTab ? 'noopener noreferrer' : null };
    const { empty } = editor.state.selection;

    if (empty || !editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)) {
      // No selection to attach the mark to — insert the label as new,
      // linked text instead of just toggling a mark on nothing.
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: text.trim() || href, marks: [{ type: 'link', attrs }] })
        .run();
    } else if (text.trim()) {
      // Replace the selected text with the (possibly edited) label, linked.
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent({ type: 'text', text: text.trim(), marks: [{ type: 'link', attrs }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink(attrs).run();
    }

    onClose();
  }

  function handleRemove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  }

  const isEditing = !!editor.getAttributes('link').href;

  // A real <form> here would nest inside BlogEditorForm's own outer form —
  // Modal renders inline rather than through a portal, so this is a plain
  // div with Enter-to-submit wired by hand instead (same fix as
  // CategorySelect's inline add-category control).
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Link' : 'Insert Link'}>
      <div
        className="space-y-4"
        onKeyDown={(e) => {
          // preventDefault matters here — without it, Enter in a text input
          // still submits the nearest ANCESTOR <form> even though this
          // modal itself isn't one (BlogEditorForm's outer form is still an
          // ancestor since Modal renders inline, not through a portal).
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <div>
          <Label required>URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" autoFocus />
        </div>
        <div>
          <Label>Display Text</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Link text" />
        </div>
        <Toggle checked={newTab} onChange={setNewTab} label="Open in new tab" />
        <div className="flex items-center justify-between gap-2 pt-2">
          <div>
            {isEditing && (
              <Button type="button" variant="ghost" className="text-red" onClick={handleRemove}>
                Remove Link
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!url.trim()} onClick={handleSubmit}>
              {isEditing ? 'Update' : 'Insert'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
