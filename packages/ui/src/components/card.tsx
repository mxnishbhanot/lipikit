import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

type DivProps = HTMLAttributes<HTMLDivElement>;

const cardVariants = cva('rounded-card border border-border text-fg-primary', {
  variants: {
    variant: {
      /** Flat panel on the page background. The default everywhere. */
      default: 'bg-surface shadow-sm',
      /** Raised: dialogs, popovers, anything floating over content. */
      elevated: 'bg-surface-elevated shadow-lg',
      /** The popup shell. Frosted, so the desktop behind stays present. */
      glass: 'glass rounded-popup border-border/60 shadow-popup',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps extends DivProps, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = 'Card';

const make = (name: string, classes: string) => {
  const Component = forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn(classes, className)} {...props} />
  ));
  Component.displayName = name;
  return Component;
};

// Generous padding is the whitespace budget: 20px gutters, 12px between a
// title and its description.
export const CardHeader = make('CardHeader', 'flex flex-col gap-1.5 p-5');
export const CardTitle = make('CardTitle', 'text-title font-semibold leading-none');
export const CardDescription = make('CardDescription', 'text-caption text-fg-muted');
export const CardContent = make('CardContent', 'p-5 pt-0');
export const CardFooter = make('CardFooter', 'flex items-center gap-2 p-5 pt-0');
