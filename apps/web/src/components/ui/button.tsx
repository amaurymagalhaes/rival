import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.01em] shadow-[0_1px_0_0_rgba(255,255,255,0.55)_inset] transition-[background-color,color,border-color,box-shadow,transform] duration-200 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15',
  {
    variants: {
      variant: {
        default:
          'border border-primary/90 bg-primary text-primary-foreground hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-[0_20px_24px_-20px_oklch(0.52_0.188_258/.72)]',
        destructive:
          'border border-destructive bg-destructive text-white hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[0_18px_22px_-18px_oklch(0.62_0.24_24/.8)]',
        outline:
          'border border-border/85 bg-card/82 text-foreground hover:border-primary/45 hover:bg-accent/65 hover:text-foreground',
        secondary:
          'border border-border/75 bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/78',
        ghost:
          'border border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/70 hover:text-foreground',
        link: 'border-0 bg-transparent p-0 text-primary underline-offset-4 hover:text-primary/85 hover:underline shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        xs: 'h-7 rounded-lg px-2.5 text-xs has-[>svg]:px-2 [&_svg]:size-3',
        sm: 'h-9 rounded-lg px-3 has-[>svg]:px-2.5',
        lg: 'h-11 rounded-xl px-6 text-[0.95rem] has-[>svg]:px-5',
        icon: 'size-10',
        'icon-xs': 'size-7 rounded-lg [&_svg]:size-3',
        'icon-sm': 'size-9 rounded-lg',
        'icon-lg': 'size-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
