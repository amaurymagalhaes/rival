import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground aria-invalid:border-destructive flex min-h-24 w-full rounded-xl border bg-white/70 px-3.5 py-2.5 text-sm shadow-[0_1px_0_0_rgba(255,255,255,0.82)_inset] transition-[background-color,border-color,box-shadow] duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-primary/70 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-ring/25',
        'aria-invalid:ring-4 aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
