import type { BlogsGateway, BlogMutationResult } from '../domain/blog.gateway';
import type { Blog, BlogMutationInput } from '../domain/blog.types';
import {
  isValidBlogId,
  sanitizeBlogMutationInput,
  validateBlogMutationInput,
} from '../domain/blog.rules';

export class BlogUseCases {
  constructor(private readonly gateway: BlogsGateway) {}

  getBlogsByOwner(headers: Record<string, string>): Promise<Blog[]> {
    return this.gateway.getBlogsByOwner(headers);
  }

  getBlogByOwner(
    id: string,
    headers: Record<string, string>,
  ): Promise<Blog | null> {
    if (!isValidBlogId(id)) {
      return Promise.resolve(null);
    }
    return this.gateway.getBlogByOwner(id, headers);
  }

  createBlogForOwner(
    input: BlogMutationInput,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult> {
    const sanitizedInput = sanitizeBlogMutationInput(input);
    const validationError = validateBlogMutationInput(sanitizedInput);
    if (validationError) {
      return Promise.resolve({ ok: false, error: validationError });
    }

    return this.gateway.createBlogForOwner(sanitizedInput, headers);
  }

  updateBlogForOwner(
    id: string,
    input: BlogMutationInput,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult> {
    if (!isValidBlogId(id)) {
      return Promise.resolve({ ok: false, error: 'Invalid blog id' });
    }

    const sanitizedInput = sanitizeBlogMutationInput(input);
    const validationError = validateBlogMutationInput(sanitizedInput);
    if (validationError) {
      return Promise.resolve({ ok: false, error: validationError });
    }

    return this.gateway.updateBlogForOwner(id, sanitizedInput, headers);
  }

  deleteBlogForOwner(
    id: string,
    headers: Record<string, string>,
  ): Promise<BlogMutationResult> {
    if (!isValidBlogId(id)) {
      return Promise.resolve({ ok: false, error: 'Invalid blog id' });
    }
    return this.gateway.deleteBlogForOwner(id, headers);
  }
}
