'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { getCmsBlogAdmin, publishCmsBlogPost, unpublishCmsBlogPost, updateCmsBlogPost } from '@/lib/api';
import { Badge, Button, ErrorNote, LoadingBlock, PageHeader } from '@/components/ui';
import BlogEditorForm, { type BlogFormValues } from '@/components/BlogEditorForm';

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // No single-post-by-id admin endpoint exists — the admin list already
  // returns full rows (including content), so find the post there.
  const { data: posts, loading, error: listError, reload } = useFetch(() => adminFetch((t) => getCmsBlogAdmin(t)), []);
  const post = posts?.find((p) => String(p.id) === id) ?? null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  async function handleSubmit(values: BlogFormValues) {
    if (!post) return;
    if (!values.title.trim() || !values.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminFetch((t) =>
        updateCmsBlogPost(t, post.id, {
          title: values.title,
          slug: values.slug,
          category: values.category,
          author: values.author,
          cover_image_url: values.cover_image_url,
          excerpt: values.excerpt,
          content: values.content,
        })
      );
      showToast('success', 'Post updated');
      router.push('/cms/blog');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update post';
      setError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublish() {
    if (!post) return;
    setToggling(true);
    try {
      if (post.is_published) {
        await adminFetch((t) => unpublishCmsBlogPost(t, post.id));
        showToast('success', 'Post unpublished');
      } else {
        await adminFetch((t) => publishCmsBlogPost(t, post.id));
        showToast('success', 'Post published');
      }
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <PageHeader title="Edit Post" />
      <Link href="/cms/blog" className="mb-4 inline-block text-xs font-semibold text-primary hover:underline">
        ← Back to Blog
      </Link>

      {loading && !posts ? (
        <LoadingBlock />
      ) : listError && !posts ? (
        <ErrorNote>{listError}</ErrorNote>
      ) : !post ? (
        <ErrorNote>Post not found.</ErrorNote>
      ) : (
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Badge tone={post.is_published ? 'green' : 'neutral'}>{post.is_published ? 'Published' : 'Draft'}</Badge>
          </div>
          <BlogEditorForm
            initial={{
              title: post.title,
              slug: post.slug,
              category: post.category,
              author: post.author,
              cover_image_url: post.cover_image_url ?? '',
              excerpt: post.excerpt ?? '',
              content: post.content,
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="Save Changes"
            error={error}
            extraAction={
              <Button type="button" variant="secondary" disabled={toggling} onClick={togglePublish}>
                {toggling ? '…' : post.is_published ? 'Unpublish' : 'Publish'}
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
