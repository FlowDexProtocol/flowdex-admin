'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, ErrorNote, Input, Label, Modal, Select, Textarea } from './ui';

export const BLOG_CATEGORIES = ['updates', 'research', 'announcements', 'partnerships'];

// Hand-rolled markdown-lite: **bold**, *italic*, [text](url), "## "/"# "
// headings, "- " lists, blank-line paragraph breaks. No dependency needed
// for what the blog content actually uses.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${i++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${i++}`}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      nodes.push(
        <a key={`${keyPrefix}-${i++}`} href={match[4]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {match[3]}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderMarkdownLite(content: string): ReactNode {
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim());
  return blocks.map((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((l) => l.startsWith('- '))) {
      return (
        <ul key={bi} className="list-disc space-y-1 pl-5">
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.slice(2), `${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }
    if (block.startsWith('## ')) {
      return (
        <h2 key={bi} className="mt-2 text-xl font-bold text-ink">
          {renderInline(block.slice(3), `${bi}`)}
        </h2>
      );
    }
    if (block.startsWith('# ')) {
      return (
        <h1 key={bi} className="mt-2 text-2xl font-bold text-ink">
          {renderInline(block.slice(2), `${bi}`)}
        </h1>
      );
    }
    return (
      <p key={bi} className="text-sm leading-relaxed text-ink-dim">
        {renderInline(block, `${bi}`)}
      </p>
    );
  });
}

function BlogPreviewModal({ open, onClose, values }: { open: boolean; onClose: () => void; values: BlogFormValues }) {
  return (
    <Modal open={open} onClose={onClose} title="Preview">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto bg-bg p-1">
        {values.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={values.cover_image_url} alt="" className="aspect-video w-full rounded-xl object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        )}
        <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{values.title || 'Untitled post'}</h1>
        <p className="text-xs text-ink-faint">
          {values.author || 'FlowDex Team'} · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
        <div className="space-y-4 border-t border-border pt-4">
          {values.content ? renderMarkdownLite(values.content) : <p className="text-sm text-ink-faint">No content yet.</p>}
        </div>
      </div>
    </Modal>
  );
}

export interface BlogFormValues {
  title: string;
  slug: string;
  category: string;
  author: string;
  cover_image_url: string;
  excerpt: string;
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogEditorForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
  error,
  extraAction,
}: {
  initial: BlogFormValues;
  onSubmit: (values: BlogFormValues) => void;
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
  extraAction?: ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Auto-generate the slug from the title until the admin edits it directly.
  useEffect(() => {
    if (!slugTouched) {
      setValues((v) => ({ ...v, slug: slugify(v.title) }));
    }
  }, [values.title, slugTouched]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label>Title</Label>
        <Input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} required />
      </div>

      <div>
        <Label>Slug</Label>
        <Input
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setValues({ ...values, slug: e.target.value });
          }}
          className="font-mono"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Category</Label>
          <Select value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })}>
            {BLOG_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Author</Label>
          <Input value={values.author} onChange={(e) => setValues({ ...values, author: e.target.value })} />
        </div>
      </div>

      <div>
        <Label>Cover Image URL</Label>
        <Input value={values.cover_image_url} onChange={(e) => setValues({ ...values, cover_image_url: e.target.value })} placeholder="https://…" />
      </div>

      <div>
        <Label>Excerpt</Label>
        <Textarea rows={2} value={values.excerpt} onChange={(e) => setValues({ ...values, excerpt: e.target.value })} placeholder="Short summary shown in listings" />
      </div>

      <div>
        <Label>Content</Label>
        <Textarea
          rows={16}
          value={values.content}
          onChange={(e) => setValues({ ...values, content: e.target.value })}
          placeholder="Post body — plain text or markdown"
          className="font-mono text-xs"
          required
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <div>{extraAction}</div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </div>

      <BlogPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} values={values} />
    </form>
  );
}
