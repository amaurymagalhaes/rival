import { Injectable } from '@nestjs/common';
import { GetPublicFeedUseCase } from '../contexts/feed/application/use-cases/get-public-feed.use-case';

@Injectable()
export class FeedService {
  constructor(private readonly getPublicFeedUseCase: GetPublicFeedUseCase) {}

  async getFeed(cursor?: string, take: number = 20) {
    return this.getPublicFeedUseCase.execute(cursor, take);
  }
}
