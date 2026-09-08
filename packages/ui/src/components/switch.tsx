import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'>;

/**
 * A real checkbox wearing a track: the input stays in the accessibility tree
 * and in the tab order, so nothing here has to re-implement keyboard toggling,
 * labels or form state. The knob is the track's `::after`, which is what lets
 * `peer-checked` reach it — a nested element could not be a sibling of the
 * input and the variant would never apply.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <span className={cn('relative inline-flex h-5 w-9 shrink-0 items-center', className)}>
    <input
      ref={ref}
      type="checkbox"
      className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      {...props}
    />
    <span
      className={cn(
        'pointer-events-none h-5 w-9 rounded-full bg-surface-hover ring-1 ring-inset ring-border',
        'transition-colors duration-fast ease-calm',
        'after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full',
        'after:bg-white after:shadow-sm after:transition-transform after:duration-fast after:ease-calm',
        'peer-checked:bg-accent peer-checked:ring-accent peer-checked:after:translate-x-4',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
        'peer-disabled:opacity-50',
      )}
    />
  </span>
));
Switch.displayName = 'Switch';
