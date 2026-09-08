import type { Transition, Variants } from 'framer-motion';

/**
 * Motion tokens. Three durations and one easing, because a calm UI that
 * animates five different ways reads as five different apps.
 *
 * Reduced motion is *not* handled here: `<MotionConfig reducedMotion="user">`
 * in the app shell makes framer-motion drop transforms and opacity fades
 * globally, which is one decision in one place instead of a media query
 * repeated in every variant.
 */
export const DURATION = {
  /** Hovers, presses, colour changes. */
  fast: 0.15,
  /** Popovers, list transitions, the default. */
  base: 0.175,
  /** The popup itself and modals — the largest thing on screen. */
  slow: 0.2,
} as const;

/** Decelerating, no overshoot. Premium is quiet, not springy. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const transition = (duration: number = DURATION.base): Transition => ({
  duration,
  ease: EASE,
});

/** Fade only: for content swapping inside a container that is already open. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition() },
  exit: { opacity: 0, transition: transition(DURATION.fast) },
};

/**
 * Fade plus a barely-there scale, anchored by the caller's `transform-origin`.
 * The popup opens at the cursor, so it should grow from there rather than
 * appear at full size.
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: transition(DURATION.slow) },
  exit: { opacity: 0, scale: 0.98, transition: transition(DURATION.fast) },
};

/** Vertical slide for stacked steps: palette to input, result back to palette. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transition() },
  exit: { opacity: 0, y: -8, transition: transition(DURATION.fast) },
};

/** Delay between siblings in a staggered list. One frame apart, no more. */
export const STAGGER = 0.03;

/**
 * The popup shell. Same motion as `scaleIn` under a name that says where it
 * belongs, so a component reads `variants={popup}` and not "a scale of what".
 */
export const popup = scaleIn;

/** Dim behind a modal. Opacity only: a scaling backdrop reads as a glitch. */
export const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition(DURATION.fast) },
  exit: { opacity: 0, transition: transition(DURATION.fast) },
};

/** Modal panel: rises slightly as it scales, so it reads as coming forward. */
export const dialog: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transition(DURATION.slow) },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: transition(DURATION.fast) },
};

/**
 * Dropdown and context menus. Shorter travel than a dialog and anchored by the
 * caller's `transform-origin`, because a menu belongs to the control that
 * opened it.
 */
export const menu: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transition(DURATION.fast) },
  exit: { opacity: 0, scale: 0.98, y: -2, transition: transition(DURATION.fast) },
};

/**
 * Lists animate as a group: the container holds the stagger and the items only
 * describe one row. Exit is reversed so a closing list collapses from the
 * bottom rather than unravelling from the top.
 */
export const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: STAGGER / 2, staggerDirection: -1 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: transition(DURATION.fast) },
  exit: { opacity: 0, y: -2, transition: transition(DURATION.fast) },
};

/**
 * Height-driven reveal for a section that grows in place (an expanded row, a
 * details panel). `height: auto` is measured by framer-motion, so the caller
 * needs `overflow-hidden` and nothing else.
 */
export const collapse: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: transition() },
  exit: { height: 0, opacity: 0, transition: transition(DURATION.fast) },
};

/**
 * Hover and press for cards and buttons, spread onto the element as props:
 * `<motion.button {...pressable}>`. Colour hovers stay in CSS — Tailwind
 * already does those and a JS animation would fight the class. This is only
 * for the transform, which CSS cannot cancel mid-press as cleanly.
 */
export const pressable = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: transition(DURATION.fast),
} as const;

/** A card that lifts on hover. Same idea, more travel, no scale on press. */
export const liftable = {
  whileHover: { y: -2 },
  transition: transition(DURATION.fast),
} as const;

/**
 * Focus is *not* here. The global `:focus-visible` ring in globals.css covers
 * every control in both windows; animating it would mean every focusable
 * element becoming a motion component for a 150ms ring fade.
 */

/** Indeterminate wait: a dot, a badge, a placeholder block breathing. */
export const loadingPulse: Variants = {
  visible: {
    opacity: [0.4, 1, 0.4],
    transition: { duration: 1.4, ease: 'easeInOut', repeat: Infinity },
  },
};

/** Spinner rotation. Linear, or it looks like it is stalling twice a turn. */
export const spin: Variants = {
  visible: { rotate: 360, transition: { duration: 0.8, ease: 'linear', repeat: Infinity } },
};

/**
 * The caret at the end of a streaming answer. Steps rather than a fade, so it
 * blinks like a terminal cursor instead of pulsing like a loading state — the
 * two mean different things and should not look alike.
 */
export const streamCaret: Variants = {
  visible: {
    opacity: [1, 1, 0, 0],
    transition: { duration: 1, times: [0, 0.49, 0.5, 1], repeat: Infinity, ease: 'linear' },
  },
};

/**
 * A streamed chunk arriving. Fade only and fast: tokens land several times a
 * second, so anything with travel turns the answer into a slot machine.
 */
export const streamIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.12, ease: EASE } },
};
