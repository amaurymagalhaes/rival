'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { postComment, type CommentFormState } from '@/app/actions/feed';

type Props = {
  blogId: string;
};

export function CommentForm({ blogId }: Props) {
  const boundAction = postComment.bind(null, blogId);
  const [state, formAction, isPending] = useActionState<CommentFormState, FormData>(
    boundAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <Textarea
        name="content"
        placeholder="Write a comment..."
        required
        rows={3}
      />
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? 'Posting...' : 'Post comment'}
      </Button>
    </form>
  );
}
