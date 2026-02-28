import { BlogCardSkeleton } from '@/components/BlogCardSkeleton';

export default function FeedLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Feed</h1>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
