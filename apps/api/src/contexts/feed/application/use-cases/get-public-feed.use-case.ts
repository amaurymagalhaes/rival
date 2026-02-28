import type {
  FeedQueryRepository,
  PublicFeedPage,
} from '../../domain/feed-query.repository';

export class GetPublicFeedUseCase {
  constructor(private readonly repository: FeedQueryRepository) {}

  execute(cursor?: string, take: number = 20): Promise<PublicFeedPage> {
    return this.repository.getPublishedFeed(cursor, take);
  }
}
