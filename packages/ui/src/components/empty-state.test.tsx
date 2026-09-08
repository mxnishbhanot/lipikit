import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, type EmptyStateKind } from './empty-state.js';

const KINDS: readonly EmptyStateKind[] = [
  'no-api-key',
  'no-history',
  'no-favorites',
  'offline',
  'error',
  'first-prompt',
];

describe('EmptyState', () => {
  it('renders an illustration and copy for every kind', () => {
    for (const kind of KINDS) {
      const { container, unmount } = render(<EmptyState kind={kind} />);
      // One drawing, and it is decorative: an empty state announces its text,
      // not its shapes.
      const art = container.querySelector('svg');
      expect(art, kind).not.toBeNull();
      expect(art?.getAttribute('aria-hidden'), kind).toBe('true');
      expect(container.querySelector('[role="status"]')?.textContent, kind).not.toBe('');
      unmount();
    }
  });

  it('prefers the caller-supplied copy over the preset', () => {
    render(<EmptyState kind="error" description="429 rate limited" />);
    expect(screen.getByText('429 rate limited')).toBeDefined();
  });

  it('renders no action slot unless one is passed', () => {
    const { container, unmount } = render(<EmptyState kind="offline" />);
    expect(container.querySelector('button')).toBeNull();
    unmount();
    render(<EmptyState kind="no-api-key" action={<button type="button">Add a key</button>} />);
    expect(screen.getByRole('button', { name: 'Add a key' })).toBeDefined();
  });
});
