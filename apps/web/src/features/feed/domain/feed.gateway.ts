import type { BlogDetail, Comment, FeedResponse, LikeStatus } from './feed.types';
import type { FeedCacheMode, FeedQuery } from './feed.rules';

export interface FeedGateway {
  getPublicFeed(
    query: FeedQuery,
    cacheMode?: FeedCacheMode,
  ): Promise<FeedResponse>;
  getPublishedBlogBySlug(slug: string): Promise<BlogDetail | null>;
  toggleBlogLike(
    blogId: string,
    newLiked: boolean,
    headers: Record<string, string>,
  ): Promise<void>;
  getBlogLikeStatus(
    blogId: string,
    headers: Record<string, string>,
  ): Promise<LikeStatus>;
  postBlogComment(
    blogId: string,
    content: string,
    headers: Record<string, string>,
  ): Promise<{ error?: string }>;
  getBlogCommentsBySlug(slug: string): Promise<Comment[]>;
}
