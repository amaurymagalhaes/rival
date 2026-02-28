import type { Comment } from '@/app/actions/feed';

export function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="border-b py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{comment.user.name}</span>
        <span>&middot;</span>
        <time>{new Date(comment.createdAt).toLocaleDateString()}</time>
      </div>
      <p className="mt-1 text-sm">{comment.content}</p>
    </div>
  );
}
