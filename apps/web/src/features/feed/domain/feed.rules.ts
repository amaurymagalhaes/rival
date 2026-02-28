export type FeedQueryInput = {
  cursor?: string;
  take?: number;
};

export type FeedQuery = {
  cursor?: string;
  take: number;
};

export type FeedCacheMode = 'cached' | 'no-store';

export const DEFAULT_FEED_TAKE = 20;
export const MIN_FEED_TAKE = 1;
export const MAX_FEED_TAKE = 50;
const MAX_COMMENT_LENGTH = 2_000;

export function normalizeFeedQuery(input: FeedQueryInput = {}): FeedQuery {
  const rawTake = input.take ?? DEFAULT_FEED_TAKE;
  const numericTake = Number.isFinite(rawTake)
    ? Math.floor(rawTake)
    : DEFAULT_FEED_TAKE;
  const take = Math.min(
    MAX_FEED_TAKE,
    Math.max(MIN_FEED_TAKE, numericTake || DEFAULT_FEED_TAKE),
  );

  const cursor = input.cursor?.trim();
  if (!cursor) {
    return { take };
  }

  return { cursor, take };
}

export function validateCommentContent(content: string): string | null {
  const normalized = content.trim();
  if (!normalized) {
    return 'Comment cannot be empty';
  }
  if (normalized.length > MAX_COMMENT_LENGTH) {
    return `Comment must be at most ${MAX_COMMENT_LENGTH} characters`;
  }
  return null;
}

export function normalizeCommentContent(content: string): string {
  return content.trim();
}

export function isCommentContentValid(content: string): boolean {
  return validateCommentContent(content) === null;
}

export function isValidSlug(slug: string): boolean {
  return slug.trim().length > 0;
}

export function isValidBlogId(blogId: string): boolean {
  return blogId.trim().length > 0;
}

export function hasAuthorizationHeader(headers: Record<string, string>): boolean {
  return typeof headers.Authorization === 'string' && headers.Authorization.length > 0;
}
