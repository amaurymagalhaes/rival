import { render, screen } from '@testing-library/react';

jest.mock('@/app/actions/feed', () => ({
  getFeed: jest.fn(),
}));

import { LiveFeedPreview } from '../LiveFeedPreview';
import { getFeed } from '@/app/actions/feed';

const mockGetFeed = getFeed as jest.MockedFunction<typeof getFeed>;

describe('LiveFeedPreview', () => {
  it('renders up to 3 recent posts', async () => {
    mockGetFeed.mockResolvedValue({
      items: [
        { id: '1', title: 'First Post', slug: 'first', summary: 'Summary one', createdAt: '2026-01-01T00:00:00Z', user: { id: 'u1', name: 'Alice' }, _count: { likes: 5, comments: 2 } },
        { id: '2', title: 'Second Post', slug: 'second', summary: 'Summary two', createdAt: '2026-01-02T00:00:00Z', user: { id: 'u2', name: 'Bob' }, _count: { likes: 3, comments: 1 } },
        { id: '3', title: 'Third Post', slug: 'third', summary: 'Summary three', createdAt: '2026-01-03T00:00:00Z', user: { id: 'u3', name: 'Charlie' }, _count: { likes: 1, comments: 0 } },
      ],
      nextCursor: null,
      hasNextPage: false,
    });

    const component = await LiveFeedPreview();
    render(component);

    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Second Post')).toBeInTheDocument();
    expect(screen.getByText('Third Post')).toBeInTheDocument();
  });

  it('shows author names', async () => {
    mockGetFeed.mockResolvedValue({
      items: [
        { id: '1', title: 'Post', slug: 'post', summary: null, createdAt: '2026-01-01T00:00:00Z', user: { id: 'u1', name: 'Alice' }, _count: { likes: 0, comments: 0 } },
      ],
      nextCursor: null,
      hasNextPage: false,
    });

    const component = await LiveFeedPreview();
    render(component);

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders fallback when no posts exist', async () => {
    mockGetFeed.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasNextPage: false,
    });

    const component = await LiveFeedPreview();
    render(component);

    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });
});
