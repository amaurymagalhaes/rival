import type { LikeRepository } from '../../domain/like.repository';

export class LikeBlogUseCase {
  constructor(private readonly repository: LikeRepository) {}

  async execute(blogId: string, userId: string) {
    await this.repository.create(blogId, userId);

    const likeCount = await this.repository.countByBlogId(blogId);
    return { liked: true, likeCount };
  }
}
