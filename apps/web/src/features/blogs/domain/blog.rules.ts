import type { BlogMutationInput } from './blog.types';

const BLOG_TITLE_MAX_LENGTH = 200;

export function sanitizeBlogMutationInput(
  input: BlogMutationInput,
): BlogMutationInput {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    isPublished: input.isPublished,
  };
}

export function validateBlogMutationInput(input: BlogMutationInput): string | null {
  if (!input.title) {
    return 'Title is required';
  }

  if (input.title.length > BLOG_TITLE_MAX_LENGTH) {
    return `Title must be at most ${BLOG_TITLE_MAX_LENGTH} characters`;
  }

  if (!input.content) {
    return 'Content is required';
  }

  return null;
}

export function isValidBlogId(id: string): boolean {
  return id.trim().length > 0;
}
