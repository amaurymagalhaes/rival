import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function BlogCardSkeleton() {
  return (
    <Card className="border-border/75">
      <CardHeader>
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-7 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-5 flex items-center gap-5">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </CardContent>
    </Card>
  );
}
