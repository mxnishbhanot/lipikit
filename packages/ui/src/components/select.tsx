import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * The native select, styled to match Input. Native rather than a listbox
 * because the OS menu is keyboard-complete, scrolls a long model list without
 * help, and renders outside the window — a custom popover in a 560px popup
 * would need every one of those written by hand.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <div className="relative inline-flex items-center">
    <select
      ref={ref}
      className={cn(
        'h-8 w-full appearance-none rounded-control border border-border bg-surface pl-3 pr-8',
        'text-caption font-medium text-fg-primary',
        'transition-colors duration-fast ease-calm hover:bg-surface-hover',
        'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-fg-muted" />
  </div>
));
Select.displayName = 'Select';
