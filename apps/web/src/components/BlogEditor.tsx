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
  CardDescription,
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
    <Card className="w-full max-w-3xl border-border/75">
      <CardHeader>
        <CardTitle className="text-2xl">
          {blog ? 'Edit Blog' : 'New Blog'}
        </CardTitle>
        <CardDescription>
          {blog
            ? 'Refine the draft and publish updates when ready.'
            : 'Draft with clarity and publish when your article is ready.'}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-5">
          {state?.error && (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" aria-live="polite">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              autoComplete="off"
              placeholder="Write a concise headline…"
              defaultValue={blog?.title ?? ''}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              name="content"
              required
              rows={14}
              autoComplete="off"
              placeholder="Write your post…"
              defaultValue={blog?.content ?? ''}
            />
          </div>

          <label
            htmlFor="isPublished"
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border/75 bg-white/70 px-3 py-2 text-sm"
          >
            <input
              id="isPublished"
              name="isPublished"
              type="checkbox"
              defaultChecked={blog?.isPublished ?? false}
              className="h-4 w-4 rounded border-border text-primary accent-primary"
            />
            Publish
          </label>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? blog
                ? 'Saving…'
                : 'Creating…'
              : blog
                ? 'Save Changes'
                : 'Create Blog'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
