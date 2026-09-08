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
