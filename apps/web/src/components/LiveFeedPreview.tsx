import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getFeed } from '@/app/actions/feed';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export async function LiveFeedPreview() {
  const data = await getFeed();
  const posts = data.items.slice(0, 3);

  if (posts.length === 0) {
    return (
      <div className="surface-panel flex min-h-40 items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">
          No posts yet — be the first to publish.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/blogs/${post.slug}`}
          className="surface-panel group block p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_24px_45px_-34px_rgba(28,54,110,0.6)]"
        >
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {dateFormatter.format(new Date(post.createdAt))}
          </p>
          <h3 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary">
            {post.title}
          </h3>
          {post.summary && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {post.summary}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span className="truncate pr-3">By {post.user.name}</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </div>
        </Link>
      ))}
    </div>
  );
}
