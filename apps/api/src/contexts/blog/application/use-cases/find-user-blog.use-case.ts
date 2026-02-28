import type { BlogRepository } from '../../domain/blog.repository';
import { BlogNotFoundError, BlogOwnershipError } from '../../domain/blog.errors';

export class FindUserBlogUseCase {
  constructor(private readonly repository: BlogRepository) {}

  async execute(id: string, userId: string) {
    const blog = await this.repository.findById(id);
    if (!blog) {
      throw new BlogNotFoundError(id);
    }

    if (blog.userId !== userId) {
      throw new BlogOwnershipError(id, userId);
    }

    return blog;
  }
}
