import type { Blog, BlogMutationInput } from './blog.types';

export type BlogMutationResult = { ok: true } | { ok: false; error: string };

export interface BlogsGateway {
  getBlogsByOwner(headers: Record<string, string>): Promise<Blog[]>;
  getBlogByOwner(id: string, headers: Record<string, string>): Promise<Blog | null>;
  createBlogForOwner(
    input: BlogMutationInput,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult>;
  updateBlogForOwner(
    id: string,
    input: BlogMutationInput,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult>;
  deleteBlogForOwner(
    id: string,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult>;
}
