import { Test, TestingModule } from '@nestjs/testing';
import { BlogSummaryProcessor } from './blog-summary.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';
import { BlogSummaryJobData } from '../interfaces/blog-summary-job.interface';

describe('BlogSummaryProcessor', () => {
  let processor: BlogSummaryProcessor;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      blog: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogSummaryProcessor,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = module.get<BlogSummaryProcessor>(BlogSummaryProcessor);
  });

  describe('generateSummary', () => {
    it('should return full text when under maxLength', () => {
      const content = 'This is a short blog post.';
      const summary = processor.generateSummary(content);
      expect(summary).toBe('This is a short blog post.');
    });

    it('should strip HTML tags', () => {
      const content = '<p>Hello <strong>world</strong></p>';
      const summary = processor.generateSummary(content);
      expect(summary).toBe('Hello world');
      expect(summary).not.toContain('<');
    });

    it('should truncate long content at sentence boundary', () => {
      const content =
        'First sentence. Second sentence. Third sentence that is very long and should push us over the limit when combined with the other sentences in this paragraph.';
      const summary = processor.generateSummary(content, 50);
      expect(summary.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(summary).toMatch(/\.(\s|$)/); // Ends at sentence boundary
    });

    it('should handle content with no sentence boundaries', () => {
      const content = 'A'.repeat(500);
      const summary = processor.generateSummary(content, 100);
      expect(summary.length).toBeLessThanOrEqual(103); // 100 + "..."
    });
  });

  describe('process', () => {
    it('should generate summary and persist to database', async () => {
      const jobData: BlogSummaryJobData = {
        blogId: 'blog-1',
        title: 'Test Blog',
        content: '<p>This is the blog content. It has multiple sentences.</p>',
      };

      const mockJob = {
        data: jobData,
        attemptsStarted: 1,
      } as unknown as Job<BlogSummaryJobData>;

      const result = await processor.process(mockJob);

      expect(result.blogId).toBe('blog-1');
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();

      expect(prisma.blog.update).toHaveBeenCalledWith({
        where: { id: 'blog-1' },
        data: { summary: expect.any(String) },
      });
    });
  });
});
