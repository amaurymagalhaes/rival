import type { Comment } from '@/app/actions/feed';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function CommentItem({ comment }: { comment: Comment }) {
  const initial = comment.user.name.charAt(0).toUpperCase();

  return (
    <article className="rounded-xl border border-border/75 bg-white/72 p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{comment.user.name}</p>
          <time className="text-xs text-muted-foreground">
            {dateFormatter.format(new Date(comment.createdAt))}
          </time>
        </div>
      </div>
      <p className="mt-3 break-words text-sm leading-relaxed text-foreground/90">
        {comment.content}
      </p>
    </article>
  );
}
