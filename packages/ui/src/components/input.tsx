import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-control border border-border bg-surface px-3 text-body text-fg-primary',
      'transition-colors duration-fast ease-calm placeholder:text-fg-muted',
      'hover:border-fg-muted/40',
      'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
