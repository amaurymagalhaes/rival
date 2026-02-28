import { FeedUseCases } from './feed.use-cases';
import type { FeedGateway } from '../domain/feed.gateway';

describe('FeedUseCases', () => {
  const gateway: jest.Mocked<FeedGateway> = {
    getPublicFeed: jest.fn(),
    getPublishedBlogBySlug: jest.fn(),
    toggleBlogLike: jest.fn(),
    postBlogComment: jest.fn(),
    getBlogCommentsBySlug: jest.fn(),
  };

  const useCases = new FeedUseCases(gateway);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes and clamps feed query', async () => {
    gateway.getPublicFeed.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasNextPage: false,
    });

    await useCases.getPublicFeed({ cursor: '  abc  ', take: 999 });

    expect(gateway.getPublicFeed).toHaveBeenCalledWith(
      { cursor: 'abc', take: 50 },
      'cached',
    );
  });

  it('returns domain error for empty comment content', async () => {
    const result = await useCases.postBlogComment(
      'blog-1',
      '   ',
      { Authorization: 'Bearer token' },
    );

    expect(result).toEqual({ error: 'Comment cannot be empty' });
    expect(gateway.postBlogComment).not.toHaveBeenCalled();
  });

  it('throws when toggling like without auth header', () => {
    expect(() => {
      useCases.toggleBlogLike('blog-1', true, {});
    }).toThrow('Authentication required');

    expect(gateway.toggleBlogLike).not.toHaveBeenCalled();
  });
});
