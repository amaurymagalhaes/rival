import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedItem } from '@/app/actions/feed';

export function BlogCard({ blog }: { blog: FeedItem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link
            href={`/blogs/${blog.slug}`}
            className="hover:underline"
          >
            {blog.title}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          By {blog.user.name} &middot;{' '}
          {new Date(blog.createdAt).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent>
        {blog.summary && (
          <p className="text-muted-foreground line-clamp-2 mb-3">{blog.summary}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart size={14} />
            {blog._count.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={14} />
            {blog._count.comments}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
