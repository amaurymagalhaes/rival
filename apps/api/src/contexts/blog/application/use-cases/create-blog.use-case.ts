import slugify from 'slugify';
import { nanoid } from 'nanoid';
import type { BlogRepository } from '../../domain/blog.repository';
import type { BlogSummaryJobsPort } from '../../domain/blog-summary-jobs.port';
import { DuplicateBlogSlugError } from '../../domain/blog.errors';
import type { BlogRecord } from '../../domain/blog.types';

export class CreateBlogUseCase {
  constructor(
    private readonly repository: BlogRepository,
    private readonly summaryJobs: BlogSummaryJobsPort,
  ) {}

  async execute(
    input: { title: string; content: string; isPublished?: boolean },
    userId: string,
  ): Promise<BlogRecord> {
    const baseSlug = slugify(input.title, { lower: true, strict: true });

    let created: BlogRecord;
    try {
      created = await this.repository.create({
        ...input,
        userId,
        slug: baseSlug,
      });
    } catch (error) {
      if (!(error instanceof DuplicateBlogSlugError)) {
        throw error;
      }

      created = await this.repository.create({
        ...input,
        userId,
        slug: `${baseSlug}-${nanoid(6)}`,
      });
    }

    if (created.isPublished) {
      await this.summaryJobs.enqueueSummaryGeneration({
        blogId: created.id,
        title: created.title,
        content: created.content,
      });
    }

    return created;
  }
}
