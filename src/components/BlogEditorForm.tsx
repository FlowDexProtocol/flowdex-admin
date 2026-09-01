'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, ErrorNote, Input, Label, Select, Textarea } from './ui';

export const BLOG_CATEGORIES = ['updates', 'research', 'announcements', 'partnerships'];

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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
