import type { FeedGateway } from '../domain/feed.gateway';
import type { BlogDetail, Comment, FeedResponse, LikeStatus } from '../domain/feed.types';
import {
  type FeedCacheMode,
  hasAuthorizationHeader,
  isValidBlogId,
  isValidSlug,
  normalizeCommentContent,
  normalizeFeedQuery,
  type FeedQueryInput,
  validateCommentContent,
} from '../domain/feed.rules';

export class FeedUseCases {
  constructor(private readonly gateway: FeedGateway) {}

  getPublicFeed(
    query?: FeedQueryInput,
    cacheMode: FeedCacheMode = 'cached',
  ): Promise<FeedResponse> {
    return this.gateway.getPublicFeed(normalizeFeedQuery(query), cacheMode);
  }

  getPublishedBlogBySlug(slug: string): Promise<BlogDetail | null> {
    if (!isValidSlug(slug)) {
      return Promise.resolve(null);
    }

    return this.gateway.getPublishedBlogBySlug(slug);
  }

  toggleBlogLike(
    blogId: string,
    newLiked: boolean,
    headers: Record<string, string>,
  ): Promise<void> {
    if (!isValidBlogId(blogId)) {
      throw new Error('Invalid blog id');
    }

    if (!hasAuthorizationHeader(headers)) {
      throw new Error('Authentication required');
    }

    return this.gateway.toggleBlogLike(blogId, newLiked, headers);
  }

  getBlogLikeStatus(
    blogId: string,
    headers: Record<string, string>,
  ): Promise<LikeStatus> {
    if (!isValidBlogId(blogId)) {
      return Promise.resolve({ liked: false, likeCount: 0 });
    }

    if (!hasAuthorizationHeader(headers)) {
      return Promise.resolve({ liked: false, likeCount: 0 });
    }

    return this.gateway.getBlogLikeStatus(blogId, headers);
  }

  postBlogComment(
    blogId: string,
    content: string,
    headers: Record<string, string>,
  ): Promise<{ error?: string }> {
    if (!isValidBlogId(blogId)) {
      return Promise.resolve({ error: 'Invalid blog id' });
    }

    if (!hasAuthorizationHeader(headers)) {
      return Promise.resolve({ error: 'Authentication required' });
    }

    const contentError = validateCommentContent(content);
    if (contentError) {
      return Promise.resolve({ error: contentError });
    }

    return this.gateway.postBlogComment(
      blogId,
      normalizeCommentContent(content),
      headers,
    );
  }

  getBlogCommentsBySlug(slug: string): Promise<Comment[]> {
    if (!isValidSlug(slug)) {
      return Promise.resolve([]);
    }

    return this.gateway.getBlogCommentsBySlug(slug);
  }
}
