export type PublicFeedItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  createdAt: Date;
  user: { id: string; name: string | null };
  _count: { likes: number; comments: number };
};

export type PublicFeedPage = {
  items: PublicFeedItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
};

export interface FeedQueryRepository {
  getPublishedFeed(cursor?: string, take?: number): Promise<PublicFeedPage>;
}
