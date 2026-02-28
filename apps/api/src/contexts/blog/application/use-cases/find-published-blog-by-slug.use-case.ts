import type { BlogRepository } from '../../domain/blog.repository';
import { BlogNotFoundError } from '../../domain/blog.errors';

export class FindPublishedBlogBySlugUseCase {
  constructor(private readonly repository: BlogRepository) {}

  async execute(slug: string) {
    const blog = await this.repository.findPublishedBySlug(slug);

    if (!blog || !blog.isPublished) {
      throw new BlogNotFoundError(slug);
    }

    return blog;
  }
}
