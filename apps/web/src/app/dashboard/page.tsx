import Link from 'next/link';
import { getBlogs } from '@/app/actions/blogs';
import { DeleteBlogButton } from '@/components/DeleteBlogButton';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function DashboardPage() {
  const blogs = await getBlogs();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Blogs</h1>
        <Link href="/dashboard/new">
          <Button>New Blog</Button>
        </Link>
      </div>

      {blogs.length === 0 ? (
        <p className="text-muted-foreground">
          No blogs yet. Create your first one!
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {blogs.map((blog) => (
            <Card key={blog.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {blog.title}
                  {!blog.isPublished && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      Draft
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {new Date(blog.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Link href={`/dashboard/edit/${blog.id}`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <DeleteBlogButton blogId={blog.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
