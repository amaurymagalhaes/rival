import { Test, TestingModule } from '@nestjs/testing';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { BlogService } from '../blog/blog.service';
import { NotFoundException } from '@nestjs/common';

describe('SeoController', () => {
  let controller: SeoController;
  let blogService: { findOneByUser: jest.Mock };
  let seoService: { analyzeBlog: jest.Mock };

  beforeEach(async () => {
    blogService = {
      findOneByUser: jest.fn(),
    };
    seoService = {
      analyzeBlog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        { provide: SeoService, useValue: seoService },
        { provide: BlogService, useValue: blogService },
      ],
    }).compile();

    controller = module.get<SeoController>(SeoController);
  });

  it('should call blogService.findOneByUser with correct params', async () => {
    const blog = { title: 'Test', content: 'Content', summary: 'Summary' };
    blogService.findOneByUser.mockResolvedValue(blog);
    seoService.analyzeBlog.mockReturnValue({ readability: {} });

    const req = { user: { id: 'user-1' } } as any;
    await controller.analyze('blog-1', req);

    expect(blogService.findOneByUser).toHaveBeenCalledWith('blog-1', 'user-1');
  });

  it('should pass blog data to seoService.analyzeBlog', async () => {
    const blog = { title: 'My Title', content: 'My Content', summary: 'My Summary' };
    blogService.findOneByUser.mockResolvedValue(blog);
    seoService.analyzeBlog.mockReturnValue({ readability: {} });

    const req = { user: { id: 'user-1' } } as any;
    await controller.analyze('blog-1', req);

    expect(seoService.analyzeBlog).toHaveBeenCalledWith('My Title', 'My Content', 'My Summary');
  });

  it('should handle blog with no summary', async () => {
    const blog = { title: 'Test', content: 'Content', summary: null };
    blogService.findOneByUser.mockResolvedValue(blog);
    seoService.analyzeBlog.mockReturnValue({ readability: {} });

    const req = { user: { id: 'user-1' } } as any;
    await controller.analyze('blog-1', req);

    expect(seoService.analyzeBlog).toHaveBeenCalledWith('Test', 'Content', undefined);
  });

  it('should propagate NotFoundException from blogService', async () => {
    blogService.findOneByUser.mockRejectedValue(new NotFoundException());

    const req = { user: { id: 'user-1' } } as any;
    await expect(controller.analyze('nonexistent', req)).rejects.toThrow(NotFoundException);
  });
});
