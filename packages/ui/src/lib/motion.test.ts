import { describe, expect, it } from 'vitest';
import {
  DURATION,
  STAGGER,
  backdrop,
  collapse,
  dialog,
  fade,
  listContainer,
  listItem,
  menu,
  popup,
  scaleIn,
  slideUp,
  spin,
  streamCaret,
  streamIn,
  transition,
} from './motion.js';

/** Entrances that also leave the screen. Loops and stagger holders are not. */
const ENTER_EXIT = { fade, scaleIn, slideUp, popup, backdrop, dialog, menu, listItem, collapse };

describe('motion tokens', () => {
  it('keeps durations ordered and short enough to feel instant', () => {
    expect(DURATION.fast).toBeLessThan(DURATION.base);
    expect(DURATION.base).toBeLessThan(DURATION.slow);
    expect(DURATION.slow).toBeLessThanOrEqual(0.25);
  });

  it('uses the token easing for every one-shot transition', () => {
    const ease = (t: ReturnType<typeof transition>): unknown => (t as { ease?: unknown }).ease;
    expect(ease(transition())).toEqual(ease(transition(DURATION.fast)));
  });

  it('gives every entrance a hidden, visible and exit state', () => {
    for (const [name, variants] of Object.entries(ENTER_EXIT)) {
      expect(Object.keys(variants).sort(), name).toEqual(['exit', 'hidden', 'visible']);
    }
  });

  it('staggers list children by less than one item animation', () => {
    const perChild = listContainer.visible as { transition: { staggerChildren: number } };
    expect(perChild.transition.staggerChildren).toBe(STAGGER);
    expect(STAGGER).toBeLessThan(DURATION.fast);
  });

  it('loops only the states that mean "still working"', () => {
    for (const variants of [spin, streamCaret]) {
      const visible = variants.visible as { transition: { repeat: number } };
      expect(visible.transition.repeat).toBe(Infinity);
    }
    expect(streamIn.visible).not.toHaveProperty('transition.repeat');
  });
});
