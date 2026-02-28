import { render, screen } from '@testing-library/react';
import { BlogCard } from '../BlogCard';
import type { FeedItem } from '@/app/actions/feed';

jest.mock('lucide-react', () => ({
  Heart: () => <span data-testid="heart-icon" />,
  MessageCircle: () => <span data-testid="message-icon" />,
}));

const mockBlog: FeedItem = {
  id: 'blog-1',
  title: 'Test Blog Title',
  slug: 'test-blog-title',
  summary: 'A short summary',
  createdAt: '2025-01-01T00:00:00.000Z',
  user: { id: 'user-1', name: 'John Doe' },
  _count: { likes: 5, comments: 3 },
};

describe('BlogCard', () => {
  it('renders title, author name, like count and comment count', () => {
    render(<BlogCard blog={mockBlog} />);

    expect(screen.getByText('Test Blog Title')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
