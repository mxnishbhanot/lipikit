import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingDots, Skeleton, SkeletonText, Spinner, StreamCaret, ThinkingIndicator } from './loading.js';

// No global cleanup is configured for this package, so every render unmounts
// itself and every query is scoped to its own container.

describe('loading states', () => {
  it('draws the requested number of skeleton lines and ends short', () => {
    const { container, unmount } = render(<SkeletonText lines={4} heading />);
    // Four lines plus the heading bar.
    const bars = container.querySelectorAll('div[aria-hidden="true"]');
    expect(bars).toHaveLength(5);
    // The closing line is the short one, so the block reads as prose.
    expect(bars[bars.length - 1]?.className).toContain('w-2/5');
    unmount();
  });

  it('announces a placeholder block as loading, not as content', () => {
    const { container, unmount } = render(<SkeletonText />);
    expect(within(container).getByRole('status').getAttribute('aria-label')).toBe('Loading');
    expect(container.querySelector('div[aria-hidden="true"]')).not.toBeNull();
    unmount();
  });

  it('hides the purely decorative indicators from screen readers', () => {
    for (const element of [<Skeleton key="s" />, <LoadingDots key="d" />, <StreamCaret key="c" />]) {
      const { container, unmount } = render(element);
      expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
      unmount();
    }
  });

  it('gives the spinner a status role only when it carries a label', () => {
    const labelled = render(<Spinner label="Saving" />);
    expect(within(labelled.container).getByRole('status', { name: 'Saving' })).toBeDefined();
    labelled.unmount();
    const plain = render(<Spinner />);
    expect(plain.container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    plain.unmount();
  });

  it('names each model phase differently', () => {
    const { container, rerender, unmount } = render(<ThinkingIndicator phase="connecting" />);
    const status = () => within(container).getByRole('status').textContent;
    const connecting = status();
    rerender(<ThinkingIndicator phase="writing" />);
    expect(status()).not.toBe(connecting);
    rerender(<ThinkingIndicator label="Summarising…" />);
    expect(status()).toContain('Summarising…');
    unmount();
  });
});
