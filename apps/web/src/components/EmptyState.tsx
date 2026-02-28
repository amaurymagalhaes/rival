export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold">No blogs published yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Be the first to share your thoughts.
      </p>
    </div>
  );
}
