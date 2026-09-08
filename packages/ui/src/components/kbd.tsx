import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** An accelerator string as the app already stores it, e.g. `Ctrl+Shift+K`. */
  readonly combo?: string;
}

/**
 * A key cap. The app is keyboard-first and every surface — palette footer,
 * shortcut settings, the result view — prints combinations, so they get one
 * component rather than three near-identical spans.
 *
 * `combo` splits on `+` and renders one cap per key: `Ctrl+K` is two caps, so
 * it stays legible at 12px instead of becoming one long pill.
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>(({ className, combo, children, ...props }, ref) => {
  const cap =
    'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm border border-border ' +
    'bg-surface-hover px-1.5 font-sans text-[11px] font-medium leading-none text-fg-secondary shadow-sm';

  if (combo === undefined) {
    return (
      <kbd ref={ref} className={cn(cap, className)} {...props}>
        {children}
      </kbd>
    );
  }

  return (
    <span ref={ref} className={cn('inline-flex items-center gap-1', className)} {...props}>
      {combo.split('+').map((key) => (
        <kbd key={key} className={cap}>
          {key}
        </kbd>
      ))}
    </span>
  );
});
Kbd.displayName = 'Kbd';
