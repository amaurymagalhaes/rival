import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary/20 selection:text-foreground border-input h-11 w-full min-w-0 rounded-xl border bg-white/70 px-3.5 py-2 text-sm shadow-[0_1px_0_0_rgba(255,255,255,0.82)_inset] transition-[background-color,border-color,box-shadow] duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-primary/70 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-ring/25',
        'aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
