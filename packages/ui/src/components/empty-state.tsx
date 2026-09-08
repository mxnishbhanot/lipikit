import { motion, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { EASE } from '../lib/motion.js';

/**
 * The six states a surface can be in when it has nothing to show. Each one is
 * a named case rather than a free-form title, because the copy is the point:
 * "no favourites" and "offline" are different problems and the user should be
 * told which one they have, in the same words every time.
 */
export type EmptyStateKind =
  'no-api-key' | 'no-history' | 'no-favorites' | 'offline' | 'error' | 'first-prompt';

interface Copy {
  readonly title: string;
  readonly description: string;
}

/**
 * Friendly, specific, and never blaming the user. Every line says what is
 * missing and what to do about it — an empty state that only says "nothing
 * here" has spent a screen to tell the user what they can already see.
 */
const COPY: Record<EmptyStateKind, Copy> = {
  'no-api-key': {
    title: 'One key away',
    description: 'Pick a provider and paste its API key, and every command here starts working.',
  },
  'no-history': {
    title: 'Nothing rewritten yet',
    description:
      'Every answer you accept is saved here — on this machine only, and only while history is on.',
  },
  'no-favorites': {
    title: 'No favourites yet',
    description: 'Star the commands you reach for most and they will sit at the top of this list.',
  },
  offline: {
    title: 'No connection',
    description: 'The providers need the network. Everything already saved stays readable while you wait.',
  },
  error: {
    title: 'That did not go through',
    description: 'The provider refused the request. Retrying often settles it.',
  },
  'first-prompt': {
    title: 'Write your first prompt',
    description: 'Save an instruction you type often, give it a shortcut, and it joins the palette.',
  },
};

/** Slow, looping, and never bouncing: an empty state is furniture, not an alert. */
const loop = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  ease: EASE,
  repeat: Infinity,
  repeatType: 'reverse',
});

/**
 * The illustrations. Built from the same primitives the rest of the UI is —
 * circles, rounded rectangles, arcs, `currentColor` — so they inherit the
 * accent and both themes for free. No raster art and no illustration pack:
 * a 40-line SVG that recolours itself beats a 60kB PNG that does not.
 *
 * The motion is one idea per drawing (a pulse, a sweep, a drift), and
 * `<MotionConfig reducedMotion="user">` in the app shell strips the transforms
 * for anyone who asked the OS for less movement.
 */
const ART: Record<EmptyStateKind, (props: { readonly size: number }) => JSX.Element> = {
  // A key beside a lock plate: the plate waits, the key drifts towards it.
  'no-api-key': ({ size }) => (
    <svg viewBox="0 0 96 96" width={size} height={size} role="presentation" aria-hidden>
      <motion.circle
        cx="48"
        cy="48"
        r="30"
        className="fill-accent/10"
        animate={{ r: [30, 33, 30], opacity: [0.9, 0.5, 0.9] }}
        transition={loop(2.6)}
      />
      <rect
        x="34"
        y="30"
        width="28"
        height="36"
        rx="9"
        className="fill-none stroke-current"
        strokeWidth="3"
      />
      <motion.g animate={{ y: [2, -2, 2] }} transition={loop(2.2)}>
        <circle cx="48" cy="44" r="5.5" className="fill-none stroke-accent" strokeWidth="3" />
        <path d="M48 49.5v9" className="stroke-accent" strokeWidth="3" strokeLinecap="round" />
        <path d="M48 55h4" className="stroke-accent" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </svg>
  ),

  // Three empty rows under a clock whose hand sweeps: history, still blank.
  'no-history': ({ size }) => (
    <svg viewBox="0 0 96 96" width={size} height={size} role="presentation" aria-hidden>
      <circle cx="48" cy="32" r="16" className="fill-accent/10 stroke-current" strokeWidth="3" />
      <motion.path
        d="M48 32v-8"
        className="stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ originX: '48px', originY: '32px' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      />
      {[0, 1, 2].map((row) => (
        <motion.rect
          key={row}
          x={26 + row * 4}
          y={58 + row * 11}
          width={44 - row * 8}
          height="7"
          rx="3.5"
          className="fill-current"
          animate={{ opacity: [0.18, 0.35, 0.18] }}
          transition={loop(2.4, row * 0.25)}
        />
      ))}
    </svg>
  ),

  // An outlined star with two sparks orbiting the space it has not been put in.
  'no-favorites': ({ size }) => (
    <svg viewBox="0 0 96 96" width={size} height={size} role="presentation" aria-hidden>
      <motion.path
        d="M48 26l6.8 13.9 15.2 2.2-11 10.8 2.6 15.2L48 60.9l-13.6 7.2 2.6-15.2-11-10.8 15.2-2.2z"
        className="fill-accent/10 stroke-current"
        strokeWidth="3"
        strokeLinejoin="round"
        animate={{ scale: [1, 1.04, 1] }}
        transition={loop(2.8)}
        style={{ originX: '48px', originY: '48px' }}
      />
      {[
        { cx: 26, cy: 30, delay: 0 },
        { cx: 72, cy: 66, delay: 0.7 },
      ].map((spark) => (
        <motion.circle
          key={spark.cx}
          cx={spark.cx}
          cy={spark.cy}
          r="3"
          className="fill-accent"
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
          transition={loop(1.9, spark.delay)}
          style={{ originX: `${spark.cx}px`, originY: `${spark.cy}px` }}
        />
      ))}
    </svg>
  ),

  // Signal arcs that fade one after another, cut by a slash.
  offline: ({ size }) => (
    <svg viewBox="0 0 96 96" width={size} height={size} role="presentation" aria-hidden>
      <circle cx="48" cy="66" r="5" className="fill-current" opacity="0.5" />
      {[16, 27, 38].map((radius, index) => (
        <motion.path
          key={radius}
          d={`M${48 - radius} 66a${radius} ${radius} 0 0 1 ${radius * 2} 0`}
          className="fill-none stroke-current"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ opacity: [0.45, 0.12, 0.45] }}
          transition={loop(1.8, index * 0.28)}
        />
      ))}
      <motion.path
        d="M26 26l44 44"
        className="stroke-warning"
        strokeWidth="4"
        strokeLinecap="round"
        animate={{ opacity: [1, 0.55, 1] }}
        transition={loop(2.2)}
      />
    </svg>
  ),

  // A triangle that leans, very slightly, the way a dropped thing settles.
  error: ({ size }) => (
    <svg viewBox="0 0 96 96" width={size} height={size} role="presentation" aria-hidden>
      <motion.g
        animate={{ rotate: [-2.5, 2.5, -2.5] }}
        transition={loop(2.4)}
        style={{ originX: '48px', originY: '60px' }}
      >
        <path
          d="M48 24l26 46a4 4 0 0 1-3.5 6h-45A4 4 0 0 1 22 70z"
          className="fill-danger/10 stroke-danger"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M48 43v14" className="stroke-danger" strokeWidth="4" strokeLinecap="round" />
        <motion.circle
          cx="48"
          cy="65"
          r="2.6"
          className="fill-danger"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={loop(1.1)}
        />
      </motion.g>
    </svg>
  ),

  // An empty prompt field with a blinking caret and a spark above it.
  'first-prompt': ({ size }) => (
    <svg viewBox="0 0 96 96" width={size} height={size} role="presentation" aria-hidden>
      <rect
        x="18"
        y="40"
        width="60"
        height="34"
        rx="11"
        className="fill-accent/10 stroke-current"
        strokeWidth="3"
      />
      <motion.rect
        x="30"
        y="50"
        width="4"
        height="14"
        rx="2"
        className="fill-accent"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
      />
      <rect x="40" y="55" width="26" height="4" rx="2" className="fill-current" opacity="0.25" />
      <motion.path
        d="M62 20l2.6 5.4 5.4 2.6-5.4 2.6L62 36l-2.6-5.4L54 28l5.4-2.6z"
        className="fill-accent"
        animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.6, 1, 0.6] }}
        transition={loop(2)}
        style={{ originX: '62px', originY: '28px' }}
      />
    </svg>
  ),
};

export interface EmptyStateProps {
  readonly kind: EmptyStateKind;
  /** Overrides the preset headline; for a case that knows something specific. */
  readonly title?: string;
  /** Overrides the preset line — an error passes the provider's own message. */
  readonly description?: ReactNode;
  /** The one thing to do next. Two buttons here is two decisions too many. */
  readonly action?: ReactNode;
  /** `sm` is the inline variant for a list section or the 560px popup. */
  readonly size?: 'sm' | 'default';
  readonly className?: string;
}

/**
 * What a surface shows instead of a list. One illustration, one headline, one
 * line of explanation, and at most one action — the same shape every time, so
 * an empty screen reads as part of the app rather than as a missing screen.
 */
export function EmptyState({
  kind,
  title,
  description,
  action,
  size = 'default',
  className,
}: EmptyStateProps): JSX.Element {
  const Art = ART[kind];
  const copy = COPY[kind];
  const small = size === 'sm';

  return (
    <div
      // `status`, not `alert`: nothing here interrupts, it just describes.
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        small ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        className,
      )}
    >
      <div className={cn('text-fg-muted', small ? 'opacity-90' : '')}>
        <Art size={small ? 48 : 88} />
      </div>
      <div className={small ? 'space-y-0.5' : 'space-y-1'}>
        <p className={cn('font-medium text-fg-primary', small ? 'text-body' : 'text-title')}>
          {title ?? copy.title}
        </p>
        <p
          className={cn(
            'mx-auto max-w-sm leading-relaxed text-fg-muted',
            small ? 'text-caption' : 'text-body',
          )}
        >
          {description ?? copy.description}
        </p>
      </div>
      {action === undefined ? null : <div className={small ? 'pt-0.5' : 'pt-1'}>{action}</div>}
    </div>
  );
}
