import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium',
  {
    variants: {
      /** Status colours are tinted fills, never solid: a badge is a label. */
      tone: {
        neutral: 'bg-surface-hover text-fg-secondary',
        accent: 'bg-accent-subtle text-accent',
        success: 'bg-success/[0.12] text-success',
        warning: 'bg-warning/[0.12] text-warning',
        danger: 'bg-danger/[0.12] text-danger',
        info: 'bg-info/[0.12] text-info',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, tone, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props} />
));
Badge.displayName = 'Badge';
