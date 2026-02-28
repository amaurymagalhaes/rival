import type { BlogRepository } from '../../domain/blog.repository';

export class FindUserBlogsUseCase {
  constructor(private readonly repository: BlogRepository) {}

  execute(userId: string) {
    return this.repository.findManyByUser(userId);
  }
}
