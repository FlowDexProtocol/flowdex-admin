'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import DOMPurify from 'dompurify';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { resolveAssetUrl, uploadFile } from '@/lib/api';
import { Button, ErrorNote, FieldError, Input, Label, Modal, Textarea } from './ui';
import ImageUploader from './ImageUploader';
import RichTextEditorImport from './RichTextEditor';
import CategorySelectImport from './CategorySelect';

// Named re-exports so callers (New/Edit post pages) don't need their own
// import lines for these — this file is already the shared "blog form" hub.
export const RichTextEditor = RichTextEditorImport;
export const CategorySelect = CategorySelectImport;

function BlogPreviewModal({ open, onClose, values }: { open: boolean; onClose: () => void; values: BlogFormValues }) {
  // Post content is admin-authored HTML (from the rich text editor), not
  // plain text — sanitized here because an editor-level account previewing
  // is one trust tier below whoever might later open the same preview.
  const safeHtml = DOMPurify.sanitize(values.content || '<p class="text-ink-faint">No content yet.</p>');

  return (
    <Modal open={open} onClose={onClose} title="Preview" size="lg">
      <div className="space-y-4 bg-bg p-1">
        {values.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={values.cover_image_url}
            alt=""
            className="aspect-video w-full rounded-xl object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{values.title || 'Untitled post'}</h1>
        <p className="text-xs text-ink-faint">
          {values.author || 'FlowDex Team'} · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
        <div
          className="prose-blog space-y-4 border-t border-border pt-4 text-sm leading-relaxed text-ink-dim"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
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
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string; content?: string }>({});

  // Auto-generate the slug from the title until the admin edits it directly.
  useEffect(() => {
    if (!slugTouched) {
      setValues((v) => ({ ...v, slug: slugify(v.title) }));
    }
  }, [values.title, slugTouched]);

  async function handleContentImageUpload(file: File): Promise<string> {
    try {
      const res = await adminFetch((token) => uploadFile(token, file));
      return resolveAssetUrl(res.url);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Image upload failed');
      throw err;
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!values.title.trim()) errors.title = 'Title is required.';
    if (!values.slug.trim()) errors.slug = 'Slug is required.';
    const plainContent = values.content.replace(/<[^>]*>/g, '').trim();
    if (!plainContent) errors.content = 'Content is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Escape' && e.stopPropagation()} className="space-y-5">
      <div>
        <Label required>Title</Label>
        <Input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} autoFocus />
        {fieldErrors.title && <FieldError>{fieldErrors.title}</FieldError>}
      </div>

      <div>
        <Label required>Slug</Label>
        <Input
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setValues({ ...values, slug: e.target.value });
          }}
          className="font-mono"
        />
        {fieldErrors.slug && <FieldError>{fieldErrors.slug}</FieldError>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CategorySelect value={values.category} onChange={(category) => setValues({ ...values, category })} required />
        <div>
          <Label>Author</Label>
          <Input value={values.author} onChange={(e) => setValues({ ...values, author: e.target.value })} />
        </div>
      </div>

      <ImageUploader label="Cover Image" value={values.cover_image_url} onChange={(url) => setValues({ ...values, cover_image_url: url })} />

      <div>
        <Label>Excerpt</Label>
        <Textarea rows={2} value={values.excerpt} onChange={(e) => setValues({ ...values, excerpt: e.target.value })} placeholder="Short summary shown in listings" />
      </div>

      <div>
        <Label required>Content</Label>
        <RichTextEditor
          value={values.content}
          onChange={(html) => setValues({ ...values, content: html })}
          onImageUpload={handleContentImageUpload}
        />
        {fieldErrors.content && <FieldError>{fieldErrors.content}</FieldError>}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <div>{extraAction}</div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>

      <BlogPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} values={values} />
    </form>
  );
}
