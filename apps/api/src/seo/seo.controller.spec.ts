import { Test, TestingModule } from '@nestjs/testing';
import { SeoController } from './seo.controller';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnalyzeBlogSeoUseCase } from '../contexts/seo/application/use-cases/analyze-blog-seo.use-case';
import { FindUserBlogUseCase } from '../contexts/blog/application/use-cases/find-user-blog.use-case';
import {
  BlogNotFoundError,
  BlogOwnershipError,
} from '../contexts/blog/domain/blog.errors';

describe('SeoController', () => {
  let controller: SeoController;
  let analyzeBlogSeo: { execute: jest.Mock };
  let findUserBlog: { execute: jest.Mock };

  beforeEach(async () => {
    analyzeBlogSeo = { execute: jest.fn() };
    findUserBlog = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        { provide: AnalyzeBlogSeoUseCase, useValue: analyzeBlogSeo },
        { provide: FindUserBlogUseCase, useValue: findUserBlog },
      ],
    }).compile();

    controller = module.get<SeoController>(SeoController);
  });

  it('should call findUserBlogUseCase with correct params', async () => {
    const blog = { title: 'Test', content: 'Content', summary: 'Summary' };
    findUserBlog.execute.mockResolvedValue(blog);
    analyzeBlogSeo.execute.mockReturnValue({ readability: {} });

    const req = { user: { id: 'user-1' } } as any;
    await controller.analyze('blog-1', req);

    expect(findUserBlog.execute).toHaveBeenCalledWith('blog-1', 'user-1');
  });

  it('should pass blog data to analyzeBlogSeoUseCase', async () => {
    const blog = {
      title: 'My Title',
      content: 'My Content',
      summary: 'My Summary',
    };
    findUserBlog.execute.mockResolvedValue(blog);
    analyzeBlogSeo.execute.mockReturnValue({ readability: {} });

    const req = { user: { id: 'user-1' } } as any;
    await controller.analyze('blog-1', req);

    expect(analyzeBlogSeo.execute).toHaveBeenCalledWith(
      'My Title',
      'My Content',
      'My Summary',
    );
  });

  it('should handle blog with no summary', async () => {
    const blog = { title: 'Test', content: 'Content', summary: null };
    findUserBlog.execute.mockResolvedValue(blog);
    analyzeBlogSeo.execute.mockReturnValue({ readability: {} });

    const req = { user: { id: 'user-1' } } as any;
    await controller.analyze('blog-1', req);

    expect(analyzeBlogSeo.execute).toHaveBeenCalledWith(
      'Test',
      'Content',
      undefined,
    );
  });

  it('should throw NotFoundException for BlogNotFoundError', async () => {
    findUserBlog.execute.mockRejectedValue(new BlogNotFoundError('blog-1'));

    const req = { user: { id: 'user-1' } } as any;
    await expect(controller.analyze('blog-1', req)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ForbiddenException for BlogOwnershipError', async () => {
    findUserBlog.execute.mockRejectedValue(
      new BlogOwnershipError('blog-1', 'user-2'),
    );

    const req = { user: { id: 'user-2' } } as any;
    await expect(controller.analyze('blog-1', req)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
