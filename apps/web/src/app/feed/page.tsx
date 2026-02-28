import { Suspense } from 'react';
import { Compass } from 'lucide-react';
import { getFeed } from '@/app/actions/feed';
import { BlogCard } from '@/components/BlogCard';
import { BlogCardSkeleton } from '@/components/BlogCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadMoreButton } from '@/components/LoadMoreButton';

export const metadata = {
  title: 'Feed',
  description: 'Browse the latest blog posts',
};

async function FeedContent() {
  const data = await getFeed();

  if (data.items.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {data.items.map((blog) => (
        <BlogCard key={blog.id} blog={blog} />
      ))}
      <LoadMoreButton initialCursor={data.nextCursor} />
    </>
  );
}

function FeedSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <BlogCardSkeleton key={i} />
      ))}
    </>
  );
}

export default function FeedPage() {
  return (
    <main className="page-shell space-y-7 py-8">
      <section className="surface-panel p-6 sm:p-8">
        <p className="kicker">Discover</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display-title text-4xl font-semibold">Feed</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Browse newly published writing and follow what the community is
              thinking about right now.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/75 bg-white/70 px-3 py-2 text-sm text-muted-foreground">
            <Compass size={15} aria-hidden="true" />
            Sorted by freshest posts
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-live="polite">
        <Suspense fallback={<FeedSkeleton />}>
          <FeedContent />
        </Suspense>
      </section>
    </main>
  );
}
