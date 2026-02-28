import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LikeButton } from '../LikeButton';

jest.mock('@/app/actions/feed', () => ({
  toggleLike: jest.fn().mockResolvedValue(undefined),
}));

describe('LikeButton', () => {
  it('renders the initial like count', () => {
    render(<LikeButton blogId="blog-1" initialLiked={false} initialCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('optimistically increments count on click', async () => {
    const user = userEvent.setup();
    render(<LikeButton blogId="blog-1" initialLiked={false} initialCount={5} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('6')).toBeInTheDocument();
  });
});
