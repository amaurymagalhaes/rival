import { Suspense } from 'react';
import { getFeed } from '@/app/actions/feed';
import { BlogCard } from '@/components/BlogCard';
import { BlogCardSkeleton } from '@/components/BlogCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadMoreButton } from '@/components/LoadMoreButton';

export const metadata = {
  title: 'Feed | Rival',
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
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Feed</h1>
      <div className="space-y-4">
        <Suspense fallback={<FeedSkeleton />}>
          <FeedContent />
        </Suspense>
      </div>
    </main>
  );
}
