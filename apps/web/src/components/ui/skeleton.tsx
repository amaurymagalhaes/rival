import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-lg bg-[linear-gradient(110deg,oklch(0.92_0.012_95)_8%,oklch(0.88_0.022_232)_18%,oklch(0.92_0.012_95)_33%)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
