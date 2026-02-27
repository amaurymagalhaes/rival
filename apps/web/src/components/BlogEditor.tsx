'use client';

import { useActionState } from 'react';
import {
  createBlog,
  updateBlog,
  type Blog,
  type BlogFormState,
} from '@/app/actions/blogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type BlogEditorProps = {
  blog?: Blog;
};

export function BlogEditor({ blog }: BlogEditorProps) {
  const action = blog ? updateBlog.bind(null, blog.id) : createBlog;
  const [state, formAction, isPending] = useActionState<
    BlogFormState,
    FormData
  >(action, null);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{blog ? 'Edit Blog' : 'New Blog'}</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={blog?.title ?? ''}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              name="content"
              required
              rows={10}
              defaultValue={blog?.content ?? ''}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isPublished"
              name="isPublished"
              type="checkbox"
              defaultChecked={blog?.isPublished ?? false}
              className="h-4 w-4"
            />
            <Label htmlFor="isPublished">Publish</Label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? blog
                ? 'Saving...'
                : 'Creating...'
              : blog
                ? 'Save Changes'
                : 'Create Blog'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
