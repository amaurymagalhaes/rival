import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BlogSummaryProducer } from './blog-summary.producer';
import { QUEUE_NAMES } from '../queue.constants';

describe('BlogSummaryProducer', () => {
  let producer: BlogSummaryProducer;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogSummaryProducer,
        {
          provide: getQueueToken(QUEUE_NAMES.BLOG_SUMMARY),
          useValue: mockQueue,
        },
      ],
    }).compile();

    producer = module.get<BlogSummaryProducer>(BlogSummaryProducer);
  });

  it('should enqueue a summary generation job', async () => {
    await producer.enqueueSummaryGeneration({
      blogId: 'blog-1',
      title: 'Test',
      content: 'Content',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'generate',
      { blogId: 'blog-1', title: 'Test', content: 'Content' },
      { jobId: 'summary-blog-1' },
    );
  });

  it('should remove existing pending job before regeneration', async () => {
    const mockExistingJob = {
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    mockQueue.getJob.mockResolvedValue(mockExistingJob);

    await producer.enqueueRegeneration({
      blogId: 'blog-1',
      title: 'Test',
      content: 'Updated',
    });

    expect(mockExistingJob.remove).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalledWith(
      'regenerate',
      { blogId: 'blog-1', title: 'Test', content: 'Updated' },
      expect.objectContaining({
        jobId: expect.stringContaining('summary-blog-1-'),
      }),
    );
  });
});
