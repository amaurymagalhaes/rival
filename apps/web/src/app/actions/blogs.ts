'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createApiUrl } from '@/lib/api';
import { getAuthHeaders } from '@/lib/auth';

export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getBlogs(): Promise<Blog[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(createApiUrl('/blogs'), { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function getBlog(id: string): Promise<Blog | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(createApiUrl(`/blogs`), { headers });
  if (!res.ok) return null;
  const blogs: Blog[] = await res.json();
  return blogs.find((b) => b.id === id) ?? null;
}

export type BlogFormState = {
  error?: string;
} | null;

export async function createBlog(
  _prevState: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  const headers = await getAuthHeaders();
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const isPublished = formData.get('isPublished') === 'on';

  const res = await fetch(createApiUrl('/blogs'), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, isPublished }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      Array.isArray(data.message) ? data.message[0] : data.message;
    return { error: message || 'Failed to create blog' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function updateBlog(
  id: string,
  _prevState: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  const headers = await getAuthHeaders();
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const isPublished = formData.get('isPublished') === 'on';

  const res = await fetch(createApiUrl(`/blogs/${id}`), {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, isPublished }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      Array.isArray(data.message) ? data.message[0] : data.message;
    return { error: message || 'Failed to update blog' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteBlog(id: string): Promise<{ error?: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(createApiUrl(`/blogs/${id}`), {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.message || 'Failed to delete blog' };
  }

  revalidatePath('/dashboard');
  return {};
}
