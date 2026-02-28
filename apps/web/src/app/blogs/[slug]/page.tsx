import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBlogBySlug } from '@/app/actions/feed';
import { getToken } from '@/lib/auth';
import { LikeButton } from '@/components/LikeButton';
import { CommentList } from '@/components/CommentList';
import { CommentForm } from '@/components/CommentForm';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: 'Not Found | Rival' };
  return {
    title: `${blog.title} | Rival`,
    description: blog.summary || blog.content.slice(0, 160),
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) notFound();

  const token = await getToken();
  const isLoggedIn = !!token;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <article>
        <h1 className="text-3xl font-bold">{blog.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          By {blog.user.name} &middot;{' '}
          {new Date(blog.createdAt).toLocaleDateString()}
        </p>
        <div className="mt-6 whitespace-pre-wrap">{blog.content}</div>
      </article>

      <div className="mt-8 flex items-center gap-4 border-t pt-4">
        <LikeButton
          blogId={blog.id}
          initialLiked={false}
          initialCount={blog._count.likes}
        />
        <span className="text-sm text-muted-foreground">
          {blog._count.comments} {blog._count.comments === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Comments</h2>
        {isLoggedIn ? (
          <div className="mt-4">
            <CommentForm blogId={blog.id} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Log in to leave a comment.
          </p>
        )}
        <div className="mt-6">
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <CommentList slug={slug} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
