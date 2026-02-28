import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { getBlogBySlug, getLikeStatus } from '@/app/actions/feed';
import { getToken } from '@/lib/auth';
import { LikeButton } from '@/components/LikeButton';
import { AiDetectorButton } from '@/components/AiDetectorButton';
import { CommentList } from '@/components/CommentList';
import { CommentForm } from '@/components/CommentForm';
import { Skeleton } from '@/components/ui/skeleton';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return { title: 'Not Found' };
  }

  return {
    title: blog.title,
    description: blog.summary || blog.content.slice(0, 160),
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const [{ slug }, token] = await Promise.all([params, getToken()]);
  const blog = await getBlogBySlug(slug);

  if (!blog) notFound();

  const isLoggedIn = !!token;
  const likeStatus = isLoggedIn
    ? await getLikeStatus(blog.id)
    : { liked: false };

  return (
    <main className="page-shell space-y-6 py-8">
      <article className="surface-panel p-6 sm:p-8">
        <p className="kicker">Published {dateFormatter.format(new Date(blog.createdAt))}</p>
        <h1 className="display-title mt-3 text-4xl leading-tight font-semibold sm:text-5xl">
          {blog.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">By {blog.user.name}</p>

        <div className="mt-8 whitespace-pre-wrap break-words text-base leading-8 text-foreground/95">
          {blog.content}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border/75 pt-5">
          <LikeButton
            blogId={blog.id}
            initialLiked={likeStatus.liked}
            initialCount={blog._count.likes}
          />
          <span className="inline-flex items-center gap-1 rounded-lg bg-accent/75 px-2.5 py-1 text-sm text-accent-foreground">
            <MessageCircle size={14} aria-hidden="true" />
            <span className="tabular-nums">{blog._count.comments}</span>
            {blog._count.comments === 1 ? 'comment' : 'comments'}
          </span>
          <div className="ml-auto">
            <AiDetectorButton content={blog.content} />
          </div>
        </div>
      </article>

      <section className="space-y-4">
        <div>
          <h2 className="display-title text-3xl font-semibold">Comments</h2>
          {!isLoggedIn && (
            <p className="mt-2 text-sm text-muted-foreground">
              Log in to leave a comment.
            </p>
          )}
        </div>

        {isLoggedIn && <CommentForm blogId={blog.id} />}

        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <CommentList slug={slug} />
        </Suspense>
      </section>
    </main>
  );
}
