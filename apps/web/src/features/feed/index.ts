import { FeedUseCases } from './application/feed.use-cases';
import { HttpFeedGateway } from './infrastructure/feed-api.gateway';

const feedUseCases = new FeedUseCases(new HttpFeedGateway());

export const getPublicFeed = feedUseCases.getPublicFeed.bind(feedUseCases);
export const getPublishedBlogBySlug =
  feedUseCases.getPublishedBlogBySlug.bind(feedUseCases);
export const toggleBlogLike = feedUseCases.toggleBlogLike.bind(feedUseCases);
export const postBlogComment = feedUseCases.postBlogComment.bind(feedUseCases);
export const getBlogCommentsBySlug =
  feedUseCases.getBlogCommentsBySlug.bind(feedUseCases);

export type { BlogDetail, Comment, FeedItem, FeedResponse } from './domain/feed.types';
export {
  DEFAULT_FEED_TAKE,
  MAX_FEED_TAKE,
  MIN_FEED_TAKE,
  isCommentContentValid,
  normalizeFeedQuery,
  type FeedQuery,
  type FeedQueryInput,
} from './domain/feed.rules';
