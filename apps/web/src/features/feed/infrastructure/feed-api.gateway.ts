import { createApiUrl } from '@/lib/api';
import type { FeedGateway } from '../domain/feed.gateway';
import type { BlogDetail, Comment, FeedResponse } from '../domain/feed.types';
import type { FeedCacheMode, FeedQuery } from '../domain/feed.rules';

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
    return maybeMessage;
  }

  return fallback;
}

export class HttpFeedGateway implements FeedGateway {
  async getPublicFeed(
    query: FeedQuery,
    cacheMode: FeedCacheMode = 'cached',
  ): Promise<FeedResponse> {
    const params = new URLSearchParams({ take: String(query.take) });
    if (query.cursor) {
      params.set('cursor', query.cursor);
    }

    const response = await fetch(
      createApiUrl(`/public/feed?${params}`),
      cacheMode === 'no-store'
        ? { cache: 'no-store' }
        : { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      return { items: [], nextCursor: null, hasNextPage: false };
    }

    return (await response.json()) as FeedResponse;
  }

  async getPublishedBlogBySlug(slug: string): Promise<BlogDetail | null> {
    const response = await fetch(createApiUrl(`/public/blogs/${slug}`), {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;
    return (await response.json()) as BlogDetail;
  }

  async toggleBlogLike(
    blogId: string,
    newLiked: boolean,
    headers: Record<string, string>,
  ): Promise<void> {
    await fetch(createApiUrl(`/blogs/${blogId}/like`), {
      method: newLiked ? 'POST' : 'DELETE',
      headers,
    });
  }

  async postBlogComment(
    blogId: string,
    content: string,
    headers: Record<string, string>,
  ): Promise<{ error?: string }> {
    const response = await fetch(createApiUrl(`/blogs/${blogId}/comments`), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      return {};
    }

    const data = await response.json().catch(() => ({}));
    return { error: parseErrorMessage(data, 'Failed to post comment') };
  }

  async getBlogCommentsBySlug(slug: string): Promise<Comment[]> {
    const response = await fetch(createApiUrl(`/public/blogs/${slug}/comments`), {
      next: { revalidate: 30 },
    });
    if (!response.ok) return [];
    return (await response.json()) as Comment[];
  }
}
