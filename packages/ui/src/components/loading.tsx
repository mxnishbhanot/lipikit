import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn.js';
import { loadingPulse, spin, streamCaret } from '../lib/motion.js';

/**
 * Every way this app says "wait", in one file.
 *
 * The five states are deliberately not interchangeable — each one answers a
 * different question, and swapping them lies to the user:
 *
 * - `Skeleton` / `SkeletonText`: the layout is known, the data is not. Use it
 *   whenever the final shape is predictable, because a shaped placeholder
 *   reads as "nearly there" while a spinner reads as "no idea".
 * - `Spinner`: a short, bounded action inside a control — validating a key,
 *   saving a row. Never for a whole screen; that is what the skeletons are.
 * - `LoadingDots`: something is coming back but nothing has arrived yet.
 * - `ThinkingIndicator`: the labelled version of the above, for the model's
 *   own phases — connecting, thinking, writing.
 * - `StreamCaret`: tokens are landing right now, at the end of the text.
 *
 * None of these handle reduced motion themselves. `<MotionConfig
 * reducedMotion="user">` in the app shell strips the transforms globally,
 * which is one decision in one place rather than a media query per component.
 */

export interface SkeletonProps {
  readonly className?: string;
}

/**
 * A placeholder block. Sized by the caller, because only the caller knows what
 * is about to fill it — a skeleton that does not match the real content is a
 * layout shift with extra steps.
 */
export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return (
    <motion.div
      variants={loadingPulse}
      animate="visible"
      aria-hidden
      className={cn('rounded-control bg-surface-hover', className)}
    />
  );
}

export interface SkeletonTextProps {
  readonly lines?: number;
  /** Renders a wider, taller bar above the lines: a list row's title. */
  readonly heading?: boolean;
  readonly className?: string;
}

/**
 * A paragraph of skeleton lines. The last one is short on purpose — text does
 * not end flush with the margin, and a stack of equal bars reads as a table.
 */
export function SkeletonText({ lines = 3, heading = false, className }: SkeletonTextProps): JSX.Element {
  return (
    <div role="status" aria-label="Loading" className={cn('w-full space-y-2', className)}>
      {heading ? <Skeleton className="h-4 w-1/3" /> : null}
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 ? 'w-2/5' : index % 2 === 0 ? 'w-full' : 'w-11/12')}
        />
      ))}
    </div>
  );
}

const SPINNER_SIZE = {
  sm: 'h-3.5 w-3.5',
  default: 'h-4 w-4',
  lg: 'h-6 w-6',
} as const;

export interface SpinnerProps {
  readonly size?: keyof typeof SPINNER_SIZE;
  /** Announced to screen readers; omit inside a button that already says it. */
  readonly label?: string;
  readonly className?: string;
}

/** Rotation lives in the `spin` motion token so reduced motion can cancel it. */
export function Spinner({ size = 'default', label, className }: SpinnerProps): JSX.Element {
  return (
    <motion.span
      variants={spin}
      animate="visible"
      role={label === undefined ? 'presentation' : 'status'}
      aria-label={label}
      aria-hidden={label === undefined}
      className={cn('inline-flex shrink-0', className)}
    >
      <Loader2 className={SPINNER_SIZE[size]} />
    </motion.span>
  );
}

export interface LoadingDotsProps {
  readonly className?: string;
}

/**
 * Three dots breathing out of phase. The stagger is a delay on the shared
 * pulse rather than three separate animations, so they cannot drift apart.
 */
export function LoadingDots({ className }: LoadingDotsProps): JSX.Element {
  return (
    <span aria-hidden className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.2, delay: index * 0.16, ease: 'easeInOut', repeat: Infinity }}
        />
      ))}
    </span>
  );
}

/**
 * What the model is doing right now. Separate phases because the wait feels
 * different at each one: a slow connect is the network's fault, a slow think
 * is the model's, and once tokens are landing nothing is stuck at all.
 */
export type LoadingPhase = 'connecting' | 'thinking' | 'writing';

const PHASE_LABEL: Record<LoadingPhase, string> = {
  connecting: 'Reaching the provider…',
  thinking: 'Thinking…',
  writing: 'Writing…',
};

export interface ThinkingIndicatorProps {
  readonly phase?: LoadingPhase;
  /** Overrides the preset line; for a surface that knows something specific. */
  readonly label?: string;
  readonly className?: string;
}

/**
 * The labelled wait. `role="status"` carries an implicit polite live region,
 * so a phase change is announced once and never interrupts a screen reader
 * mid-sentence.
 */
export function ThinkingIndicator({
  phase = 'thinking',
  label,
  className,
}: ThinkingIndicatorProps): JSX.Element {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-body text-fg-muted', className)}>
      <span className="text-accent">
        <LoadingDots />
      </span>
      {label ?? PHASE_LABEL[phase]}
    </span>
  );
}

export interface StreamCaretProps {
  readonly className?: string;
}

/**
 * The block caret at the end of a streaming answer. Blinks in steps like a
 * terminal cursor — a pulse would read as another loading state, and the two
 * mean different things.
 */
export function StreamCaret({ className }: StreamCaretProps): JSX.Element {
  return (
    <motion.span
      variants={streamCaret}
      animate="visible"
      aria-hidden
      className={cn('ml-0.5 inline-block h-4 w-2 translate-y-0.5 rounded-[2px] bg-accent', className)}
    />
  );
}
