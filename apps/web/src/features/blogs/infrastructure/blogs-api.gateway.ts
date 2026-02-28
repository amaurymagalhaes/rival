import { createApiUrl } from '@/lib/api';
import type {
  BlogMutationResult,
  BlogsGateway,
} from '../domain/blog.gateway';
import type { Blog, BlogMutationInput } from '../domain/blog.types';

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const maybeMessage = (data as { message?: unknown }).message;
  if (Array.isArray(maybeMessage) && typeof maybeMessage[0] === 'string') {
    return maybeMessage[0];
  }

  if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
    return maybeMessage;
  }

  return fallback;
}

async function toMutationResult(
  response: Response,
  fallback: string,
): Promise<BlogMutationResult> {
  if (response.ok) {
    return { ok: true };
  }

  const data = await response.json().catch(() => ({}));
  return {
    ok: false,
    error: parseErrorMessage(data, fallback),
  };
}

export class HttpBlogsGateway implements BlogsGateway {
  async getBlogsByOwner(headers: Record<string, string>): Promise<Blog[]> {
    const response = await fetch(createApiUrl('/blogs'), { headers });
    if (!response.ok) return [];
    return (await response.json()) as Blog[];
  }

  async getBlogByOwner(
    id: string,
    headers: Record<string, string>,
  ): Promise<Blog | null> {
    const response = await fetch(createApiUrl(`/blogs/${id}`), { headers });
    if (!response.ok) return null;
    return (await response.json()) as Blog;
  }

  async createBlogForOwner(
    input: BlogMutationInput,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult> {
    const response = await fetch(createApiUrl('/blogs'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    return toMutationResult(response, 'Failed to create blog');
  }

  async updateBlogForOwner(
    id: string,
    input: BlogMutationInput,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult> {
    const response = await fetch(createApiUrl(`/blogs/${id}`), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    return toMutationResult(response, 'Failed to update blog');
  }

  async deleteBlogForOwner(
    id: string,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult> {
    const response = await fetch(createApiUrl(`/blogs/${id}`), {
      method: 'DELETE',
      headers,
    });

    return toMutationResult(response, 'Failed to delete blog');
  }
}
