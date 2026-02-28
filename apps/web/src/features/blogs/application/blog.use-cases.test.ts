import { BlogUseCases } from './blog.use-cases';
import type { BlogsGateway } from '../domain/blog.gateway';

describe('BlogUseCases', () => {
  const gateway: jest.Mocked<BlogsGateway> = {
    getBlogsByOwner: jest.fn(),
    getBlogByOwner: jest.fn(),
    createBlogForOwner: jest.fn(),
    updateBlogForOwner: jest.fn(),
    deleteBlogForOwner: jest.fn(),
  };

  const useCases = new BlogUseCases(gateway);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns validation error when title is empty', async () => {
    const result = await useCases.createBlogForOwner(
      { title: '   ', content: 'content', isPublished: false },
      { Authorization: 'Bearer token' },
    );

    expect(result).toEqual({ ok: false, error: 'Title is required' });
    expect(gateway.createBlogForOwner).not.toHaveBeenCalled();
  });

  it('trims input before calling gateway', async () => {
    gateway.createBlogForOwner.mockResolvedValue({ ok: true });

    await useCases.createBlogForOwner(
      { title: '  A title  ', content: '  body  ', isPublished: true },
      { Authorization: 'Bearer token' },
    );

    expect(gateway.createBlogForOwner).toHaveBeenCalledWith(
      { title: 'A title', content: 'body', isPublished: true },
      { Authorization: 'Bearer token' },
    );
  });
});
