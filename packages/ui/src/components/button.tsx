import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control',
    'text-body font-medium',
    'transition-colors duration-fast ease-calm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        /** The one emerald control on a screen: submit, run, save. */
        default: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 active:bg-accent/95',
        secondary: 'bg-surface-hover text-fg-primary hover:bg-surface-hover/70',
        destructive: 'bg-danger text-white shadow-sm hover:bg-danger/90',
        outline: 'border border-border bg-surface text-fg-primary shadow-sm hover:bg-surface-hover',
        ghost: 'text-fg-secondary hover:bg-surface-hover hover:text-fg-primary',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-caption',
        lg: 'h-11 px-6 text-body-lg',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return <Component className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
