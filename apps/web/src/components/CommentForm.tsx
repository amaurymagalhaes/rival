'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { postComment, type CommentFormState } from '@/app/actions/feed';

type Props = {
  blogId: string;
};

export function CommentForm({ blogId }: Props) {
  const boundAction = postComment.bind(null, blogId);
  const [state, formAction, isPending] = useActionState<
    CommentFormState,
    FormData
  >(boundAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === null && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="surface-panel space-y-3 p-4"
    >
      <Textarea
        name="content"
        placeholder="Write a comment…"
        required
        rows={3}
        autoComplete="off"
      />
      {state?.error && (
        <p className="text-sm text-destructive" aria-live="polite">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? 'Posting…' : 'Post Comment'}
      </Button>
    </form>
  );
}
