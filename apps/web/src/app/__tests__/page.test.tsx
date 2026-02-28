import { render, screen } from '@testing-library/react';
import Home from '../page';

jest.mock('@/components/LiveFeedPreview', () => ({
  LiveFeedPreview: () => <div data-testid="live-feed-preview">Feed Preview</div>,
}));

describe('Home page', () => {
  it('renders the main headline', () => {
    render(<Home />);
    expect(screen.getByText(/get read/i)).toBeInTheDocument();
  });

  it('renders CTA buttons linking to register', () => {
    render(<Home />);
    const ctas = screen.getAllByRole('link', { name: /start writing/i });
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    ctas.forEach((cta) => {
      expect(cta).toHaveAttribute('href', '/register');
    });
  });

  it('renders four feature cards', () => {
    render(<Home />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    const featureTitles = headings.map((h) => h.textContent);
    expect(featureTitles).toContain('Clean Editor');
    expect(featureTitles).toContain('Discovery');
    expect(featureTitles).toContain('Engagement');
    expect(featureTitles).toContain('SEO Built In');
  });

  it('renders the live feed preview section', () => {
    render(<Home />);
    expect(screen.getByTestId('live-feed-preview')).toBeInTheDocument();
    expect(screen.getByText(/what.s being written right now/i)).toBeInTheDocument();
  });

  it('renders the final CTA section', () => {
    render(<Home />);
    expect(screen.getByText(/your next post is waiting/i)).toBeInTheDocument();
  });

  it('uses HyperBlog branding, not Rival', () => {
    render(<Home />);
    expect(screen.queryByText('Rival')).not.toBeInTheDocument();
  });
});
