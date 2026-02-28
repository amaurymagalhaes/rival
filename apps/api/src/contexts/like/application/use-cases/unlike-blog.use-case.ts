import type { LikeRepository } from '../../domain/like.repository';

export class UnlikeBlogUseCase {
  constructor(private readonly repository: LikeRepository) {}

  async execute(blogId: string, userId: string) {
    await this.repository.delete(blogId, userId);

    const likeCount = await this.repository.countByBlogId(blogId);
    return { liked: false, likeCount };
  }
}
