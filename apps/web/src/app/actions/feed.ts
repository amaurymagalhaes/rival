'use server';

import { revalidatePath } from 'next/cache';
import { getAuthHeaders } from '@/lib/auth';
import type {
  BlogDetail,
  Comment,
  FeedResponse,
} from '@/features/feed/domain/feed.types';
import {
  getBlogCommentsBySlug,
  getPublicFeed,
  getPublishedBlogBySlug,
  postBlogComment,
  toggleBlogLike,
} from '@/features/feed';

export type { FeedItem, FeedResponse, BlogDetail, Comment } from '@/features/feed/domain/feed.types';

export async function getFeed(cursor?: string): Promise<FeedResponse> {
  return getPublicFeed({ cursor });
}

export async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  return getPublishedBlogBySlug(slug);
}

export async function toggleLike(
  blogId: string,
  newLiked: boolean,
): Promise<void> {
  const headers = await getAuthHeaders();
  await toggleBlogLike(blogId, newLiked, headers);

  revalidatePath('/feed');
  revalidatePath('/blogs', 'layout');
}

export type CommentFormState = {
  error?: string;
} | null;

export async function postComment(
  blogId: string,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const headers = await getAuthHeaders();
  const content = formData.get('content') as string;

  const result = await postBlogComment(blogId, content, headers);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/blogs', 'layout');
  revalidatePath('/feed');
  return null;
}

export async function getComments(slug: string): Promise<Comment[]> {
  return getBlogCommentsBySlug(slug);
}
