import { Skeleton } from '@/components/ui/skeleton';

export default function BlogDetailLoading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-8 flex items-center gap-4 border-t pt-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-20 w-full" />
      </div>
    </main>
  );
}
