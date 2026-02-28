import type { LikeRepository } from '../../domain/like.repository';

export class GetLikeStatusUseCase {
  constructor(private readonly repository: LikeRepository) {}

  async execute(blogId: string, userId: string) {
    const [liked, likeCount] = await Promise.all([
      this.repository.hasLiked(blogId, userId),
      this.repository.countByBlogId(blogId),
    ]);

    return { liked, likeCount };
  }
}
