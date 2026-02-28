'use server';

import { revalidatePath } from 'next/cache';
import { createApiUrl } from '@/lib/api';
import { getAuthHeaders } from '@/lib/auth';

export type FeedItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  createdAt: string;
  user: { id: string; name: string };
  _count: { likes: number; comments: number };
};

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type BlogDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  createdAt: string;
  isPublished: boolean;
  user: { id: string; name: string; email: string };
  _count: { likes: number; comments: number };
};

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
};

export async function getFeed(cursor?: string): Promise<FeedResponse> {
  const params = new URLSearchParams({ take: '20' });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(createApiUrl(`/public/feed?${params}`), {
    next: { revalidate: 60 },
  });

  if (!res.ok) return { items: [], nextCursor: null, hasNextPage: false };
  return res.json();
}

export async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  const res = await fetch(createApiUrl(`/public/blogs/${slug}`), {
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function toggleLike(
  blogId: string,
  liked: boolean,
): Promise<void> {
  const headers = await getAuthHeaders();
  const method = liked ? 'DELETE' : 'POST';

  await fetch(createApiUrl(`/blogs/${blogId}/like`), {
    method,
    headers,
  });

  revalidatePath('/feed');
  revalidatePath('/blogs');
}

export type CommentFormState = {
  error?: string;
} | null;

export async function postComment(
  blogId: string,
  prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const headers = await getAuthHeaders();
  const content = formData.get('content') as string;

  if (!content?.trim()) {
    return { error: 'Comment cannot be empty' };
  }

  const res = await fetch(createApiUrl(`/blogs/${blogId}/comments`), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.message || 'Failed to post comment' };
  }

  revalidatePath('/blogs');
  return null;
}

export async function getComments(slug: string): Promise<Comment[]> {
  const res = await fetch(createApiUrl(`/public/blogs/${slug}/comments`), {
    next: { revalidate: 30 },
  });

  if (!res.ok) return [];
  return res.json();
}
