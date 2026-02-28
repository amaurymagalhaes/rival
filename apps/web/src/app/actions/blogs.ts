'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import type { Blog, BlogMutationInput } from '@/features/blogs/domain/blog.types';
import {
  createBlogForOwner,
  deleteBlogForOwner,
  getBlogByOwner,
  getBlogsByOwner,
  updateBlogForOwner,
} from '@/features/blogs';

export type { Blog } from '@/features/blogs/domain/blog.types';

export async function getBlogs(): Promise<Blog[]> {
  const headers = await getAuthHeaders();
  return getBlogsByOwner(headers);
}

export async function getBlog(id: string): Promise<Blog | null> {
  const headers = await getAuthHeaders();
  return getBlogByOwner(id, headers);
}

export type BlogFormState = {
  error?: string;
} | null;

export async function createBlog(
  _prevState: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  const headers = await getAuthHeaders();
  const input: BlogMutationInput = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    isPublished: formData.get('isPublished') === 'on',
  };

  const result = await createBlogForOwner(input, headers);

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  revalidatePath('/feed');
  redirect('/dashboard');
}

export async function updateBlog(
  id: string,
  _prevState: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  const headers = await getAuthHeaders();
  const input: BlogMutationInput = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    isPublished: formData.get('isPublished') === 'on',
  };

  const result = await updateBlogForOwner(id, input, headers);

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  revalidatePath('/feed');
  redirect('/dashboard');
}

export async function deleteBlog(id: string): Promise<{ error?: string }> {
  const headers = await getAuthHeaders();
  const result = await deleteBlogForOwner(id, headers);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  revalidatePath('/feed');
  return {};
}
