import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedItem } from '@/app/actions/feed';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function BlogCard({ blog }: { blog: FeedItem }) {
  return (
    <Card className="group border-border/75">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="min-w-0 text-xl leading-tight">
            <Link
              href={`/blogs/${blog.slug}`}
              className="underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline"
            >
              {blog.title}
            </Link>
          </CardTitle>
          <span className="rounded-md bg-accent px-2 py-1 text-[0.65rem] font-semibold tracking-[0.1em] text-accent-foreground uppercase">
            Article
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          By {blog.user.name} · {dateFormatter.format(new Date(blog.createdAt))}
        </p>
      </CardHeader>
      <CardContent>
        {blog.summary && (
          <p className="mb-4 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
            {blog.summary}
          </p>
        )}
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Heart size={14} aria-hidden="true" />
            {blog._count.likes}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle size={14} aria-hidden="true" />
            {blog._count.comments}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
