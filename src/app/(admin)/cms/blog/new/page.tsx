'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { createCmsBlogPost } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import BlogEditorForm, { BLOG_CATEGORIES, type BlogFormValues } from '@/components/BlogEditorForm';

const EMPTY: BlogFormValues = {
  title: '',
  slug: '',
  category: BLOG_CATEGORIES[0],
  author: 'FlowDex Team',
  cover_image_url: '',
  excerpt: '',
  content: '',
};

export default function NewBlogPostPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: BlogFormValues) {
    if (!values.title.trim() || !values.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminFetch((t) =>
        createCmsBlogPost(t, {
          title: values.title,
          slug: values.slug,
          category: values.category,
          author: values.author || undefined,
          cover_image_url: values.cover_image_url || undefined,
          excerpt: values.excerpt || undefined,
          content: values.content,
        })
      );
      showToast('success', 'Post created');
      router.push('/cms/blog');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create post';
      setError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Post" description="Create a new blog post. It's saved as a draft until published." />
      <Link href="/cms/blog" className="mb-4 inline-block text-xs font-semibold text-primary hover:underline">
        ← Back to Blog
      </Link>
      <div className="max-w-2xl">
        <BlogEditorForm initial={EMPTY} onSubmit={handleSubmit} submitting={submitting} submitLabel="Create Post" error={error} />
      </div>
    </div>
  );
}
